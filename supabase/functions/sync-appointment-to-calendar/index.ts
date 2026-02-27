import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface SyncRequest {
  appointment_id: string;
  action: "create" | "update" | "delete";
}

// ── Auth helper ────────────────────────────────────────────────────

function verifyServiceAuth(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");

  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  if (webhookSecret && token === webhookSecret) return;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) return;

  // Decode JWT and verify it has service_role claim (legacy JWT from DB triggers via vault)
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === "service_role") return;
    }
  } catch {
    // Not a valid JWT
  }

  throw new Error("Unauthorized");
}

// ── Google Calendar helpers ────────────────────────────────────────

async function googleCreateEvent(
  accessToken: string,
  calendarId: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: timezone },
        end: { dateTime: endDateTime, timeZone: timezone },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Calendar create failed: ${err}`);
  }

  const data = await response.json();
  return data.id;
}

async function googleUpdateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: timezone },
        end: { dateTime: endDateTime, timeZone: timezone },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Calendar update failed: ${err}`);
  }

  const data = await response.json();
  return data.id;
}

async function googleDeleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Google Calendar delete failed: ${err}`);
  }
}

// ── Outlook Calendar helpers ───────────────────────────────────────

async function outlookCreateEvent(
  accessToken: string,
  calendarId: string,
  subject: string,
  bodyContent: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        body: { contentType: "text", content: bodyContent },
        start: { dateTime: startDateTime, timeZone: timezone },
        end: { dateTime: endDateTime, timeZone: timezone },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Outlook Calendar create failed: ${err}`);
  }

  const data = await response.json();
  return data.id;
}

async function outlookUpdateEvent(
  accessToken: string,
  eventId: string,
  subject: string,
  bodyContent: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        body: { contentType: "text", content: bodyContent },
        start: { dateTime: startDateTime, timeZone: timezone },
        end: { dateTime: endDateTime, timeZone: timezone },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Outlook Calendar update failed: ${err}`);
  }

  const data = await response.json();
  return data.id;
}

async function outlookDeleteEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const err = await response.text();
    throw new Error(`Outlook Calendar delete failed: ${err}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = "America/Toronto";

function computeEndDateTime(scheduledAt: string, durationMinutes: number): string {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return end.toISOString();
}

function buildEventSummary(
  title?: string | null,
  contactFirstName?: string,
  contactLastName?: string
): string {
  if (title) return title;
  const name = [contactFirstName, contactLastName].filter(Boolean).join(" ");
  return name ? `Appointment with ${name}` : "Appointment — Courtside AI";
}

function buildEventDescription(
  contactFirstName?: string,
  contactLastName?: string,
  contactPhone?: string,
  notes?: string,
  contactEmail?: string,
  contactCompany?: string,
  campaignName?: string | null,
  leadNotes?: string | null
): string {
  const lines: string[] = [];

  if (campaignName) {
    lines.push(`Booked via Courtside AI • Campaign: ${campaignName}`);
  } else {
    lines.push("Booked via Courtside AI");
  }

  lines.push("");
  lines.push("── Contact ──");
  const name = [contactFirstName, contactLastName].filter(Boolean).join(" ");
  if (name) lines.push(`Name: ${name}`);
  if (contactPhone) lines.push(`Phone: ${contactPhone}`);
  if (contactEmail) lines.push(`Email: ${contactEmail}`);
  if (contactCompany) lines.push(`Company: ${contactCompany}`);

  if (notes) {
    lines.push("");
    lines.push("── Notes ──");
    lines.push(notes);
  }

  if (leadNotes) {
    lines.push("");
    lines.push("── Lead Notes ──");
    lines.push(leadNotes);
  }

  return lines.join("\n");
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
    verifyServiceAuth(req);

    const body: SyncRequest = await req.json();
    const { appointment_id, action } = body;

    if (!appointment_id) {
      return errorResponse("Missing required field: appointment_id", 400);
    }

    if (!action || !["create", "update", "delete"].includes(action)) {
      return errorResponse("Invalid action. Must be create, update, or delete.", 400);
    }

    const supabase = createServiceClient();

    // ── Fetch appointment with calendar connection ──
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select(
        "id, org_id, scheduled_at, duration_minutes, notes, contact_id, lead_id, campaign_id, calendar_event_id, calendar_connection_id, sync_status, status, title"
      )
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      return errorResponse("Appointment not found", 404);
    }

    // ── No calendar connection → skip sync ──
    if (!appointment.calendar_connection_id) {
      return jsonResponse({
        synced: false,
        reason: "no_calendar_connection",
      });
    }

    // ── Look up calendar connection → integration ──
    const { data: calConn, error: calConnError } = await supabase
      .from("calendar_connections")
      .select("id, integration_id, provider, provider_calendar_id")
      .eq("id", appointment.calendar_connection_id)
      .single();

    if (calConnError || !calConn) {
      await updateSyncStatus(supabase, appointment_id, "failed");
      return jsonResponse({
        synced: false,
        reason: "calendar_connection_not_found",
      });
    }

    // ── Get valid access token with refresh ──
    const providerType = calConn.provider as "google" | "outlook";
    const accessToken = await getValidAccessToken(calConn.integration_id, providerType);

    if (!accessToken) {
      await updateSyncStatus(supabase, appointment_id, "failed");
      return jsonResponse({
        synced: false,
        reason: "token_refresh_failed",
      });
    }

    const isGoogle = providerType === "google";
    const calendarId = calConn.provider_calendar_id;

    // ── Fetch contact ──
    let contact: { first_name?: string; last_name?: string; phone?: string; email?: string; company?: string } | null = null;
    if (appointment.contact_id) {
      const { data } = await supabase
        .from("contacts")
        .select("first_name, last_name, phone, email, company")
        .eq("id", appointment.contact_id)
        .single();
      contact = data;
    }

    // ── Fetch campaign name ──
    let campaignName: string | null = null;
    if (appointment.campaign_id) {
      const { data: camp } = await supabase
        .from("campaigns")
        .select("name")
        .eq("id", appointment.campaign_id)
        .single();
      campaignName = camp?.name ?? null;
    }

    // ── Fetch lead notes ──
    let leadNotes: string | null = null;
    if (appointment.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("notes")
        .eq("id", appointment.lead_id)
        .single();
      leadNotes = lead?.notes ?? null;
    }

    const summary = buildEventSummary(appointment.title, contact?.first_name, contact?.last_name);
    const description = buildEventDescription(
      contact?.first_name,
      contact?.last_name,
      contact?.phone,
      appointment.notes,
      contact?.email,
      contact?.company,
      campaignName,
      leadNotes
    );
    const startDateTime = appointment.scheduled_at;
    const endDateTime = computeEndDateTime(
      appointment.scheduled_at,
      appointment.duration_minutes ?? 30
    );

    let calendarEventId: string | null = appointment.calendar_event_id;

    // ── Execute action ──
    try {
      switch (action) {
        case "create": {
          if (isGoogle) {
            calendarEventId = await googleCreateEvent(
              accessToken, calendarId, summary, description,
              startDateTime, endDateTime, DEFAULT_TIMEZONE
            );
          } else {
            calendarEventId = await outlookCreateEvent(
              accessToken, calendarId, summary, description,
              startDateTime, endDateTime, DEFAULT_TIMEZONE
            );
          }
          break;
        }

        case "update": {
          if (!calendarEventId) {
            // No existing event — create instead
            if (isGoogle) {
              calendarEventId = await googleCreateEvent(
                accessToken, calendarId, summary, description,
                startDateTime, endDateTime, DEFAULT_TIMEZONE
              );
            } else {
              calendarEventId = await outlookCreateEvent(
                accessToken, calendarId, summary, description,
                startDateTime, endDateTime, DEFAULT_TIMEZONE
              );
            }
          } else {
            if (isGoogle) {
              calendarEventId = await googleUpdateEvent(
                accessToken, calendarId, calendarEventId, summary,
                description, startDateTime, endDateTime, DEFAULT_TIMEZONE
              );
            } else {
              calendarEventId = await outlookUpdateEvent(
                accessToken, calendarEventId, summary,
                description, startDateTime, endDateTime, DEFAULT_TIMEZONE
              );
            }
          }
          break;
        }

        case "delete": {
          if (!calendarEventId) {
            return jsonResponse({
              synced: true,
              calendar_event_id: null,
              provider: providerType,
              message: "No calendar event to delete",
            });
          }

          if (isGoogle) {
            await googleDeleteEvent(accessToken, calendarId, calendarEventId);
          } else {
            await outlookDeleteEvent(accessToken, calendarEventId);
          }

          await supabase
            .from("appointments")
            .update({
              calendar_event_id: null,
              calendar_provider: null,
              calendar_synced_at: new Date().toISOString(),
              sync_status: "synced",
            })
            .eq("id", appointment_id);

          return jsonResponse({
            synced: true,
            calendar_event_id: null,
            provider: providerType,
          });
        }
      }

      // ── Update appointment with calendar metadata (create/update) ──
      await supabase
        .from("appointments")
        .update({
          calendar_event_id: calendarEventId,
          calendar_provider: providerType,
          calendar_synced_at: new Date().toISOString(),
          sync_status: "synced",
        })
        .eq("id", appointment_id);

      return jsonResponse({
        synced: true,
        calendar_event_id: calendarEventId,
        provider: providerType,
      });
    } catch (syncError) {
      console.error("Calendar sync operation failed:", syncError);
      await updateSyncStatus(supabase, appointment_id, "failed");
      return jsonResponse({
        synced: false,
        reason: syncError.message ?? "calendar_api_error",
      });
    }
  } catch (error) {
    console.error("sync-appointment-to-calendar error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});

// ── Helper to update sync_status ──

async function updateSyncStatus(
  supabase: ReturnType<typeof createServiceClient>,
  appointmentId: string,
  status: string
) {
  await supabase
    .from("appointments")
    .update({ sync_status: status })
    .eq("id", appointmentId);
}
