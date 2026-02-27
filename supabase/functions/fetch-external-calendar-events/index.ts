import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  provider: string;
  calendar_name: string;
  color: string | null;
}

// ── Google Calendar helpers ────────────────────────────────────────

async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  startDate: string,
  endDate: string,
  timezone: string
): Promise<CalendarEvent[]> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set("timeMin", `${startDate}T00:00:00Z`);
  url.searchParams.set("timeMax", `${endDate}T23:59:59Z`);
  url.searchParams.set("timeZone", timezone);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Google Calendar events error:", err);
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  const items = data.items ?? [];

  return items
    .filter((item: { status?: string }) => item.status !== "cancelled")
    .map((item: {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }) => ({
      id: item.id,
      title: item.summary ?? "(No title)",
      start: item.start?.dateTime ?? item.start?.date ?? "",
      end: item.end?.dateTime ?? item.end?.date ?? "",
      all_day: !item.start?.dateTime,
      provider: "google",
      calendar_name: "", // filled in by caller
      color: null,       // filled in by caller
    }));
}

// ── Outlook Calendar helpers ───────────────────────────────────────

async function fetchOutlookEvents(
  accessToken: string,
  calendarId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const url = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView`
  );
  url.searchParams.set("startDateTime", `${startDate}T00:00:00.000Z`);
  url.searchParams.set("endDateTime", `${endDate}T23:59:59.000Z`);
  url.searchParams.set("$select", "id,subject,start,end,isAllDay,isCancelled");
  url.searchParams.set("$top", "250");
  url.searchParams.set("$orderby", "start/dateTime");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Outlook Calendar events error:", err);
    throw new Error(`Outlook Calendar API error: ${response.status}`);
  }

  const data = await response.json();
  const events = data.value ?? [];

  return events
    .filter((e: { isCancelled?: boolean }) => !e.isCancelled)
    .map((e: {
      id: string;
      subject?: string;
      start: { dateTime: string };
      end: { dateTime: string };
      isAllDay?: boolean;
    }) => ({
      id: e.id,
      title: e.subject ?? "(No title)",
      start: e.isAllDay ? e.start.dateTime.split("T")[0] : e.start.dateTime + "Z",
      end: e.isAllDay ? e.end.dateTime.split("T")[0] : e.end.dateTime + "Z",
      all_day: e.isAllDay ?? false,
      provider: "outlook",
      calendar_name: "",
      color: null,
    }));
}

// ── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const url = new URL(req.url);
    const calendarConnectionId = url.searchParams.get("calendar_connection_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const timezone = url.searchParams.get("timezone") || "America/Toronto";

    if (!calendarConnectionId || !startDate || !endDate) {
      return errorResponse(
        "Missing required parameters: calendar_connection_id, start_date, end_date",
        400
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    // Fetch calendar connection (RLS ensures org scoping)
    const { data: calConn, error: calConnError } = await supabase
      .from("calendar_connections")
      .select("id, integration_id, provider, provider_calendar_id, calendar_name, color")
      .eq("id", calendarConnectionId)
      .single();

    if (calConnError || !calConn) {
      return errorResponse("Calendar connection not found", 404);
    }

    // Get valid access token
    const providerType = calConn.provider as "google" | "outlook";
    const accessToken = await getValidAccessToken(calConn.integration_id, providerType);

    if (!accessToken) {
      return errorResponse("Calendar authentication expired. Please reconnect.", 401);
    }

    // Fetch events
    let events: CalendarEvent[];

    if (providerType === "google") {
      events = await fetchGoogleEvents(
        accessToken,
        calConn.provider_calendar_id,
        startDate,
        endDate,
        timezone
      );
    } else {
      events = await fetchOutlookEvents(
        accessToken,
        calConn.provider_calendar_id,
        startDate,
        endDate
      );
    }

    // Enrich with calendar metadata
    for (const event of events) {
      event.calendar_name = calConn.calendar_name;
      event.color = calConn.color;
    }

    return jsonResponse({ events });
  } catch (error) {
    console.error("fetch-external-calendar-events error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
