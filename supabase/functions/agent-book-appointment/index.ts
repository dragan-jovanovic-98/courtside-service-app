import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getCalendarProvider } from "../_shared/calendar-providers.ts";
import type { BusyPeriod } from "../_shared/calendar-providers.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";
import {
  formatTimeForSpeech,
  formatDateTimeForSpeech,
} from "../_shared/speech.ts";
import { logToolCall, startTimer } from "../_shared/tool-logger.ts";

// ── Helpers ────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getTimezoneOffset(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (!tzPart) return "+00:00";
  const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
  if (!match) return "+00:00";
  return match[1];
}

function buildISO(dateStr: string, time24: string, timezone: string): string {
  const date = new Date(`${dateStr}T${time24}:00`);
  const offset = getTimezoneOffset(date, timezone);
  return `${dateStr}T${time24}:00${offset}`;
}

function addMinutesToISO(isoStr: string, minutes: number): string {
  const date = new Date(isoStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function decodeBase64Url(str: string): string {
  let b64 = str.trim().replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(binary);
}

function verifyServiceAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token === serviceKey) return true;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const decoded = decodeBase64Url(parts[1]);
    const payload = JSON.parse(decoded);
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Validate that a string is a valid ISO 8601 datetime.
 */
function isValidISO(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    if (!verifyServiceAuth(req)) {
      return errorResponse("Unauthorized — service role key required", 401);
    }

    const elapsed = startTimer();
    const rawBody = await req.json();

    // Retell sends { name, args, call } — extract accordingly
    const isRetell = rawBody.args !== undefined || rawBody.call !== undefined;
    const args = isRetell ? (rawBody.args ?? {}) : rawBody;
    const callObj = rawBody.call ?? {};
    const meta = callObj.metadata ?? {};
    const dynVars = callObj.retell_llm_dynamic_variables ?? {};

    // Tool parameters from args
    const scheduled_at = args.scheduled_at;
    const durationOverride = args.duration_minutes;
    const notes = args.notes;

    // Context from call metadata/dynamic vars
    const campaign_id = args.campaign_id || meta.campaign_id || dynVars.campaign_id;
    const org_id = args.org_id || meta.org_id || dynVars.org_id;
    const lead_id = args.lead_id || meta.lead_id || dynVars.lead_id;
    const contact_id = args.contact_id || meta.contact_id || dynVars.contact_id;
    const call_metadata = isRetell ? { call_id: callObj.call_id } : rawBody.call_metadata;

    const logInput = { campaign_id, org_id, lead_id, scheduled_at };
    const callId = call_metadata?.call_id ?? null;

    // ── Validate input ──
    if (!campaign_id) return errorResponse("campaign_id is required — pass it in Retell call metadata", 400);
    if (!lead_id) return errorResponse("lead_id is required — pass it in Retell call metadata", 400);
    if (!contact_id) return errorResponse("contact_id is required — pass it in Retell call metadata", 400);
    if (!org_id) return errorResponse("org_id is required — pass it in Retell call metadata", 400);
    if (!scheduled_at) return errorResponse("scheduled_at is required", 400);

    if (!isValidISO(scheduled_at)) {
      return errorResponse("scheduled_at must be a valid ISO 8601 datetime", 400);
    }

    const supabase = createServiceClient();

    // ── Resolve campaign context ──
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id, org_id, calendar_connection_id, default_meeting_duration, " +
        "booking_enabled, timezone"
      )
      .eq("id", campaign_id)
      .eq("org_id", org_id)
      .single();

    if (campaignError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    const durationMinutes = durationOverride || campaign.default_meeting_duration || 30;

    // Resolve timezone
    let timezone = campaign.timezone;
    if (!timezone) {
      const { data: org } = await supabase
        .from("organizations")
        .select("timezone")
        .eq("id", org_id)
        .single();
      timezone = org?.timezone || "America/Toronto";
    }

    // ── Check booking_enabled ──
    if (campaign.booking_enabled === false) {
      const scheduledDate = new Date(scheduled_at);
      const dateStr = scheduledDate.toLocaleDateString("en-CA", { timeZone: timezone });
      const timeStr = scheduledDate.toLocaleTimeString("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const formatted = formatDateTimeForSpeech(dateStr, timeStr, timezone);

      logToolCall({ tool_name: "agent-book-appointment", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { booked: false, reason: "booking_disabled" }, duration_ms: elapsed() });
      return jsonResponse({
        booked: false,
        reason: "booking_disabled",
        speakableResponse:
          `I've noted your preferred time of ${formatted}. ` +
          "Someone from our team will reach out to confirm your appointment shortly.",
        meta: {
          preferred_time_noted: true,
          campaign_id,
        },
      });
    }

    // ── Re-verify availability (race condition check) ──
    const appointmentStart = new Date(scheduled_at);
    const appointmentEnd = new Date(appointmentStart.getTime() + durationMinutes * 60_000);
    const dateStr = appointmentStart.toLocaleDateString("en-CA", { timeZone: timezone });

    // Check Courtside appointments for conflicts
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("scheduled_at, duration_minutes")
      .eq("org_id", org_id)
      .neq("status", "cancelled")
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    const hasConflict = (existingAppts ?? []).some((appt) => {
      const existStart = new Date(appt.scheduled_at);
      const existEnd = new Date(existStart.getTime() + (appt.duration_minutes ?? 30) * 60_000);
      return appointmentStart < existEnd && appointmentEnd > existStart;
    });

    if (hasConflict) {
      // Slot was taken — find alternatives on the same day
      // (simplified: just return the conflict notice, agent can call check-availability again)
      logToolCall({ tool_name: "agent-book-appointment", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { booked: false, reason: "slot_taken" }, duration_ms: elapsed() });
      return jsonResponse({
        booked: false,
        reason: "slot_taken",
        alternatives: [],
        speakableResponse:
          "I apologize, but that slot was just taken. " +
          "Let me check what else is available for you.",
      });
    }

    // ── Create appointment in DB ──
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        org_id,
        lead_id,
        contact_id,
        campaign_id,
        ...(call_metadata?.call_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(call_metadata.call_id) && { call_id: call_metadata.call_id }),
        scheduled_at,
        duration_minutes: durationMinutes,
        notes,
        calendar_connection_id: campaign.calendar_connection_id,
        sync_status: campaign.calendar_connection_id ? "pending" : "not_applicable",
        status: "scheduled",
      })
      .select("id")
      .single();

    if (insertError || !appointment) {
      console.error("Failed to create appointment:", insertError);
      return errorResponse("Failed to create appointment", 500);
    }

    // ── Update lead status to appt_set ──
    await supabase
      .from("leads")
      .update({ status: "appt_set", updated_at: new Date().toISOString() })
      .eq("id", lead_id)
      .eq("org_id", org_id);

    // ── Create calendar event (synchronous for agent bookings) ──
    let calendarEventCreated = false;

    if (campaign.calendar_connection_id) {
      const { data: calConn } = await supabase
        .from("calendar_connections")
        .select("id, integration_id, provider, provider_calendar_id")
        .eq("id", campaign.calendar_connection_id)
        .single();

      if (calConn) {
        const providerType = calConn.provider as "google" | "outlook";
        const token = await getValidAccessToken(calConn.integration_id, providerType);

        if (token) {
          try {
            // Fetch contact name for the event summary
            const { data: contact } = await supabase
              .from("contacts")
              .select("first_name, last_name, email")
              .eq("id", contact_id)
              .single();

            const contactName = contact
              ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
              : "Lead";

            const provider = getCalendarProvider(providerType);
            const endISO = addMinutesToISO(scheduled_at, durationMinutes);

            const { eventId } = await provider.createEvent(
              token,
              calConn.provider_calendar_id,
              {
                summary: `Appointment with ${contactName}`,
                description: notes || `Booked by AI agent during call`,
                startDateTime: scheduled_at,
                endDateTime: endISO,
                timezone,
                ...(contact?.email && {
                  attendees: [{ email: contact.email, name: contactName }],
                }),
              }
            );

            // Update appointment with calendar event ID
            await supabase
              .from("appointments")
              .update({
                calendar_event_id: eventId,
                calendar_provider: providerType,
                sync_status: "success",
                calendar_synced_at: new Date().toISOString(),
              })
              .eq("id", appointment.id);

            calendarEventCreated = true;
          } catch (err) {
            console.error("Failed to create calendar event:", err);
            // Appointment is still booked in DB — just no calendar event
            await supabase
              .from("appointments")
              .update({ sync_status: "failed" })
              .eq("id", appointment.id);
          }
        }
      }
    }

    // ── Fire N8N webhook ──
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (n8nUrl) {
      fetch(`${n8nUrl}/appointment-created`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          org_id,
          lead_id,
          contact_id,
          campaign_id,
          source: "ai_agent",
          call_metadata,
        }),
      }).catch((err) => console.error("N8N webhook failed:", err));
    }

    // ── Format response ──
    const scheduledDate = new Date(scheduled_at);
    const fmtDate = scheduledDate.toLocaleDateString("en-CA", { timeZone: timezone });
    const fmtTime = scheduledDate.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const endDate = new Date(scheduledDate.getTime() + durationMinutes * 60_000);
    const fmtEndTime = endDate.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const timeFormatted = formatDateTimeForSpeech(fmtDate, fmtTime, timezone);

    logToolCall({ tool_name: "agent-book-appointment", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { booked: true, appointment_id: appointment.id, calendar_event_created: calendarEventCreated }, duration_ms: elapsed() });
    return jsonResponse({
      booked: true,
      appointment_id: appointment.id,
      time: timeFormatted,
      timeISO: scheduled_at,
      endTime: formatTimeForSpeech(fmtEndTime),
      endTimeISO: addMinutesToISO(scheduled_at, durationMinutes),
      duration_minutes: durationMinutes,
      calendar_event_created: calendarEventCreated,
      speakableResponse:
        `Perfect! I've booked your appointment for ${timeFormatted}. ` +
        "You'll receive a confirmation shortly. Is there anything else I can help with?",
    });
  } catch (error) {
    console.error("agent-book-appointment error:", error);
    logToolCall({ tool_name: "agent-book-appointment", org_id: "unknown", input: {}, output: {}, duration_ms: 0, error: error.message ?? "Internal server error" });
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
