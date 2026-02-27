import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getCalendarProvider } from "../_shared/calendar-providers.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";
import {
  formatTimeForSpeech,
  formatDateTimeForSpeech,
} from "../_shared/speech.ts";
import { logToolCall, startTimer } from "../_shared/tool-logger.ts";

// ── Helpers ────────────────────────────────────────────────────────

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

function isValidISO(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function addMinutesToISO(isoStr: string, minutes: number): string {
  const date = new Date(isoStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
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
    const appointment_id = args.appointment_id;
    const new_scheduled_at = args.new_scheduled_at;
    const reason = args.reason;

    // Context from call metadata/dynamic vars
    const campaign_id = args.campaign_id || meta.campaign_id || dynVars.campaign_id;
    const org_id = args.org_id || meta.org_id || dynVars.org_id;
    const call_metadata = isRetell ? { call_id: callObj.call_id } : rawBody.call_metadata;

    const logInput = { appointment_id, campaign_id, org_id, new_scheduled_at };
    const callId = call_metadata?.call_id ?? null;

    // ── Validate input ──
    if (!appointment_id) return errorResponse("appointment_id is required", 400);
    if (!campaign_id) return errorResponse("campaign_id is required — pass it in Retell call metadata", 400);
    if (!org_id) return errorResponse("org_id is required — pass it in Retell call metadata", 400);
    if (!new_scheduled_at) return errorResponse("new_scheduled_at is required", 400);

    if (!isValidISO(new_scheduled_at)) {
      return errorResponse("new_scheduled_at must be a valid ISO 8601 datetime", 400);
    }

    const supabase = createServiceClient();

    // ── Fetch existing appointment ──
    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select(
        "id, org_id, scheduled_at, duration_minutes, status, " +
        "calendar_event_id, calendar_provider, calendar_connection_id, " +
        "lead_id, contact_id, campaign_id"
      )
      .eq("id", appointment_id)
      .eq("org_id", org_id)
      .single();

    if (fetchError || !existing) {
      logToolCall({ tool_name: "agent-reschedule-appointment", org_id, campaign_id, call_id: callId, input: logInput, output: { rescheduled: false, reason: "appointment_not_found" }, duration_ms: elapsed() });
      return jsonResponse({
        rescheduled: false,
        reason: "appointment_not_found",
        speakableResponse:
          "I wasn't able to find that appointment. Let me take down your preferred time " +
          "and someone will follow up to get this sorted out.",
      });
    }

    if (existing.status === "cancelled") {
      logToolCall({ tool_name: "agent-reschedule-appointment", org_id, campaign_id, call_id: callId, input: logInput, output: { rescheduled: false, reason: "appointment_cancelled" }, duration_ms: elapsed() });
      return jsonResponse({
        rescheduled: false,
        reason: "appointment_cancelled",
        speakableResponse:
          "That appointment has been cancelled. Would you like to book a new appointment instead?",
      });
    }

    // ── Resolve campaign context ──
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, calendar_connection_id, default_meeting_duration, timezone")
      .eq("id", campaign_id)
      .eq("org_id", org_id)
      .single();

    const durationMinutes = existing.duration_minutes ?? campaign?.default_meeting_duration ?? 30;

    // Resolve timezone
    let timezone = campaign?.timezone;
    if (!timezone) {
      const { data: org } = await supabase
        .from("organizations")
        .select("timezone")
        .eq("id", org_id)
        .single();
      timezone = org?.timezone || "America/Toronto";
    }

    // ── Re-verify availability at new time ──
    const newStart = new Date(new_scheduled_at);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);
    const dateStr = newStart.toLocaleDateString("en-CA", { timeZone: timezone });

    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes")
      .eq("org_id", org_id)
      .neq("status", "cancelled")
      .neq("id", appointment_id) // Exclude the appointment being rescheduled
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    const hasConflict = (existingAppts ?? []).some((appt) => {
      const existStart = new Date(appt.scheduled_at);
      const existEnd = new Date(existStart.getTime() + (appt.duration_minutes ?? 30) * 60_000);
      return newStart < existEnd && newEnd > existStart;
    });

    if (hasConflict) {
      logToolCall({ tool_name: "agent-reschedule-appointment", org_id, campaign_id, call_id: callId, input: logInput, output: { rescheduled: false, reason: "slot_taken" }, duration_ms: elapsed() });
      return jsonResponse({
        rescheduled: false,
        reason: "slot_taken",
        alternatives: [],
        speakableResponse:
          "I'm sorry, that slot just became unavailable. " +
          "Let me check what other times are available for you.",
      });
    }

    // ── Format old time for response ──
    const oldDate = new Date(existing.scheduled_at);
    const oldDateStr = oldDate.toLocaleDateString("en-CA", { timeZone: timezone });
    const oldTimeStr = oldDate.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const oldFormatted = formatDateTimeForSpeech(oldDateStr, oldTimeStr, timezone);

    // ── Update appointment in DB ──
    const updatePayload: Record<string, unknown> = {
      scheduled_at: new_scheduled_at,
      updated_at: new Date().toISOString(),
    };
    if (reason) {
      updatePayload.notes = existing.notes
        ? `${existing.notes}\n\nRescheduled: ${reason}`
        : `Rescheduled: ${reason}`;
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", appointment_id);

    if (updateError) {
      console.error("Failed to update appointment:", updateError);
      return errorResponse("Failed to reschedule appointment", 500);
    }

    // ── Update calendar event if exists ──
    let calendarEventUpdated = false;
    const calConnId = existing.calendar_connection_id ?? campaign?.calendar_connection_id;

    if (existing.calendar_event_id && calConnId) {
      const { data: calConn } = await supabase
        .from("calendar_connections")
        .select("id, integration_id, provider, provider_calendar_id")
        .eq("id", calConnId)
        .single();

      if (calConn) {
        const providerType = calConn.provider as "google" | "outlook";
        const token = await getValidAccessToken(calConn.integration_id, providerType);

        if (token) {
          try {
            const provider = getCalendarProvider(providerType);
            const endISO = addMinutesToISO(new_scheduled_at, durationMinutes);

            await provider.updateEvent(
              token,
              calConn.provider_calendar_id,
              existing.calendar_event_id,
              {
                startDateTime: new_scheduled_at,
                endDateTime: endISO,
                timezone,
              }
            );

            await supabase
              .from("appointments")
              .update({
                sync_status: "success",
                calendar_synced_at: new Date().toISOString(),
              })
              .eq("id", appointment_id);

            calendarEventUpdated = true;
          } catch (err) {
            console.error("Failed to update calendar event:", err);
            await supabase
              .from("appointments")
              .update({ sync_status: "failed" })
              .eq("id", appointment_id);
          }
        }
      }
    }

    // ── Fire N8N webhook ──
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (n8nUrl) {
      fetch(`${n8nUrl}/appointment-rescheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id,
          org_id,
          lead_id: existing.lead_id,
          contact_id: existing.contact_id,
          campaign_id,
          old_scheduled_at: existing.scheduled_at,
          new_scheduled_at,
          reason,
          source: "ai_agent",
          call_metadata,
        }),
      }).catch((err) => console.error("N8N webhook failed:", err));
    }

    // ── Format new time for response ──
    const newDateStr = newStart.toLocaleDateString("en-CA", { timeZone: timezone });
    const newTimeStr = newStart.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const newFormatted = formatDateTimeForSpeech(newDateStr, newTimeStr, timezone);
    const newEndDate = new Date(newStart.getTime() + durationMinutes * 60_000);
    const newEndTimeStr = newEndDate.toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    logToolCall({ tool_name: "agent-reschedule-appointment", org_id, campaign_id, call_id: callId, lead_id: existing.lead_id, input: logInput, output: { rescheduled: true, appointment_id, calendar_event_updated: calendarEventUpdated }, duration_ms: elapsed() });
    return jsonResponse({
      rescheduled: true,
      appointment_id,
      old_time: oldFormatted,
      oldTimeISO: existing.scheduled_at,
      new_time: newFormatted,
      newTimeISO: new_scheduled_at,
      duration_minutes: durationMinutes,
      calendar_event_updated: calendarEventUpdated,
      speakableResponse:
        `Done! I've moved your appointment to ${newFormatted}. ` +
        "You'll receive an updated confirmation.",
    });
  } catch (error) {
    console.error("agent-reschedule-appointment error:", error);
    logToolCall({ tool_name: "agent-reschedule-appointment", org_id: "unknown", input: {}, output: {}, duration_ms: 0, error: error.message ?? "Internal server error" });
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
