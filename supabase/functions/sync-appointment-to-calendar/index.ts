import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

// ── Types ──────────────────────────────────────────────────────────

interface SyncRequest {
  appointment_id: string;
  action: "create" | "update" | "delete";
}

interface CalendarEventResult {
  eventId: string;
  provider: string;
}

// ── Auth helper ────────────────────────────────────────────────────

function verifyServiceAuth(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

  if (token !== serviceRoleKey && token !== webhookSecret) {
    throw new Error("Unauthorized");
  }
}

// ── Google Calendar helpers ────────────────────────────────────────

async function googleCreateEvent(
  accessToken: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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
  eventId: string,
  summary: string,
  description: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
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
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // 204 No Content or 410 Gone are both acceptable
  if (!response.ok && response.status !== 204 && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Google Calendar delete failed: ${err}`);
  }
}

// ── Outlook Calendar helpers ───────────────────────────────────────

async function outlookCreateEvent(
  accessToken: string,
  subject: string,
  bodyContent: string,
  startDateTime: string,
  endDateTime: string,
  timezone: string
): Promise<string> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/events",
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

function buildEventSummary(contactFirstName?: string, contactLastName?: string): string {
  const name = [contactFirstName, contactLastName].filter(Boolean).join(" ");
  return name ? `Appointment with ${name}` : "Appointment — Courtside AI";
}

function buildEventDescription(
  contactFirstName?: string,
  contactLastName?: string,
  contactPhone?: string,
  notes?: string
): string {
  const parts: string[] = [];
  const name = [contactFirstName, contactLastName].filter(Boolean).join(" ");
  if (name) parts.push(`Contact: ${name}`);
  if (contactPhone) parts.push(`Phone: ${contactPhone}`);
  if (notes) parts.push(`\nNotes:\n${notes}`);
  parts.push("\nBooked via Courtside AI");
  return parts.join("\n");
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
    // ── Auth: service role or webhook secret ──
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

    // ── Fetch appointment ──
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select(
        "id, org_id, scheduled_at, duration_minutes, notes, contact_id, calendar_event_id, status"
      )
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      return errorResponse("Appointment not found", 404);
    }

    // ── Fetch contact ──
    let contact: { first_name?: string; last_name?: string; phone?: string } | null = null;

    if (appointment.contact_id) {
      const { data } = await supabase
        .from("contacts")
        .select("first_name, last_name, phone")
        .eq("id", appointment.contact_id)
        .single();
      contact = data;
    }

    // ── Fetch calendar integration ──
    const { data: integrations } = await supabase
      .from("integrations")
      .select("service_name, config")
      .eq("org_id", appointment.org_id)
      .in("service_name", ["google_calendar", "outlook_calendar"])
      .eq("status", "connected");

    if (!integrations || integrations.length === 0) {
      return jsonResponse({
        synced: false,
        reason: "no_calendar_connected",
      });
    }

    const integration = integrations[0];
    const config = integration.config as Record<string, string>;
    const accessToken = config?.access_token;

    if (!accessToken) {
      return jsonResponse({
        synced: false,
        reason: "no_access_token_in_integration_config",
      });
    }

    const provider = integration.service_name as string;
    const isGoogle = provider === "google_calendar";
    const summary = buildEventSummary(contact?.first_name, contact?.last_name);
    const description = buildEventDescription(
      contact?.first_name,
      contact?.last_name,
      contact?.phone,
      appointment.notes
    );
    const startDateTime = appointment.scheduled_at;
    const endDateTime = computeEndDateTime(
      appointment.scheduled_at,
      appointment.duration_minutes ?? 30
    );

    let calendarEventId: string | null = appointment.calendar_event_id;

    // ── Execute action ──
    switch (action) {
      case "create": {
        if (isGoogle) {
          calendarEventId = await googleCreateEvent(
            accessToken,
            summary,
            description,
            startDateTime,
            endDateTime,
            DEFAULT_TIMEZONE
          );
        } else {
          calendarEventId = await outlookCreateEvent(
            accessToken,
            summary,
            description,
            startDateTime,
            endDateTime,
            DEFAULT_TIMEZONE
          );
        }
        break;
      }

      case "update": {
        if (!calendarEventId) {
          return errorResponse(
            "Cannot update: appointment has no calendar_event_id. Create it first.",
            400
          );
        }

        if (isGoogle) {
          calendarEventId = await googleUpdateEvent(
            accessToken,
            calendarEventId,
            summary,
            description,
            startDateTime,
            endDateTime,
            DEFAULT_TIMEZONE
          );
        } else {
          calendarEventId = await outlookUpdateEvent(
            accessToken,
            calendarEventId,
            summary,
            description,
            startDateTime,
            endDateTime,
            DEFAULT_TIMEZONE
          );
        }
        break;
      }

      case "delete": {
        if (!calendarEventId) {
          // Nothing to delete from calendar
          return jsonResponse({
            synced: true,
            calendar_event_id: null,
            provider,
            message: "No calendar event to delete",
          });
        }

        if (isGoogle) {
          await googleDeleteEvent(accessToken, calendarEventId);
        } else {
          await outlookDeleteEvent(accessToken, calendarEventId);
        }

        // Clear calendar fields on the appointment
        await supabase
          .from("appointments")
          .update({
            calendar_event_id: null,
            calendar_provider: null,
            calendar_synced_at: new Date().toISOString(),
          })
          .eq("id", appointment_id);

        return jsonResponse({
          synced: true,
          calendar_event_id: null,
          provider,
        });
      }
    }

    // ── Update appointment with calendar metadata (create/update) ──
    await supabase
      .from("appointments")
      .update({
        calendar_event_id: calendarEventId,
        calendar_provider: provider,
        calendar_synced_at: new Date().toISOString(),
      })
      .eq("id", appointment_id);

    return jsonResponse({
      synced: true,
      calendar_event_id: calendarEventId,
      provider,
    });
  } catch (error) {
    console.error("sync-appointment-to-calendar error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
