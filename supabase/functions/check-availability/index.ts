import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient, createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface BusyPeriod {
  start: Date;
  end: Date;
}

// ── Constants ──────────────────────────────────────────────────────

const BUSINESS_HOURS_START = 9;  // 9 AM
const BUSINESS_HOURS_END = 17;   // 5 PM
const DEFAULT_TIMEZONE = "America/Toronto";

// ── Calendar API helpers ───────────────────────────────────────────

async function getGoogleBusyPeriods(
  accessToken: string,
  dateStart: string,
  dateEnd: string,
  timezone: string
): Promise<BusyPeriod[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: `${dateStart}T00:00:00`,
        timeMax: `${dateEnd}T23:59:59`,
        timeZone: timezone,
        items: [{ id: "primary" }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Google FreeBusy API error:", err);
    return [];
  }

  const data = await response.json();
  const busySlots = data.calendars?.primary?.busy ?? [];

  return busySlots.map((slot: { start: string; end: string }) => ({
    start: new Date(slot.start),
    end: new Date(slot.end),
  }));
}

async function getOutlookBusyPeriods(
  accessToken: string,
  dateStart: string,
  dateEnd: string
): Promise<BusyPeriod[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", `${dateStart}T00:00:00.000Z`);
  url.searchParams.set("endDateTime", `${dateEnd}T23:59:59.000Z`);
  url.searchParams.set("$select", "start,end,isCancelled");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Outlook CalendarView API error:", err);
    return [];
  }

  const data = await response.json();
  const events = data.value ?? [];

  return events
    .filter((e: { isCancelled?: boolean }) => !e.isCancelled)
    .map((e: { start: { dateTime: string }; end: { dateTime: string } }) => ({
      start: new Date(e.start.dateTime + "Z"),
      end: new Date(e.end.dateTime + "Z"),
    }));
}

// ── Slot computation ───────────────────────────────────────────────

function computeAvailableSlots(
  date: string,
  durationMinutes: number,
  busyPeriods: BusyPeriod[],
  timezone: string
): TimeSlot[] {
  // Build minute-level occupancy for business hours
  const totalMinutes = (BUSINESS_HOURS_END - BUSINESS_HOURS_START) * 60;
  const occupied = new Array(totalMinutes).fill(false);

  // Reference start-of-business as a Date for comparison
  const businessStart = new Date(`${date}T${pad(BUSINESS_HOURS_START)}:00:00`);
  const businessEnd = new Date(`${date}T${pad(BUSINESS_HOURS_END)}:00:00`);

  for (const busy of busyPeriods) {
    // Clamp to business hours
    const bStart = busy.start < businessStart ? businessStart : busy.start;
    const bEnd = busy.end > businessEnd ? businessEnd : busy.end;

    if (bStart >= bEnd) continue;

    const startMin = Math.floor(
      (bStart.getTime() - businessStart.getTime()) / 60_000
    );
    const endMin = Math.ceil(
      (bEnd.getTime() - businessStart.getTime()) / 60_000
    );

    for (let m = Math.max(0, startMin); m < Math.min(totalMinutes, endMin); m++) {
      occupied[m] = true;
    }
  }

  // Walk through and collect free slots of at least `durationMinutes`
  const slots: TimeSlot[] = [];

  for (let m = 0; m <= totalMinutes - durationMinutes; m += durationMinutes) {
    let free = true;
    for (let d = 0; d < durationMinutes; d++) {
      if (occupied[m + d]) {
        free = false;
        break;
      }
    }
    if (free) {
      const startHour = BUSINESS_HOURS_START + Math.floor(m / 60);
      const startMinute = m % 60;
      const endOffset = m + durationMinutes;
      const endHour = BUSINESS_HOURS_START + Math.floor(endOffset / 60);
      const endMinute = endOffset % 60;

      slots.push({
        start: `${pad(startHour)}:${pad(startMinute)}`,
        end: `${pad(endHour)}:${pad(endMinute)}`,
      });
    }
  }

  return slots;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
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
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const durationParam = url.searchParams.get("duration");
    const orgIdParam = url.searchParams.get("org_id");

    if (!date) {
      return errorResponse("Missing required query parameter: date", 400);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    const durationMinutes = durationParam ? parseInt(durationParam, 10) : 30;
    if (isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      return errorResponse("Duration must be between 15 and 240 minutes.", 400);
    }

    // ── Determine org and supabase client ──
    // Support two auth modes:
    //   1. JWT auth from dashboard (uses getAuthContext)
    //   2. org_id param from Retell webhook context (uses service role client)
    let orgId: string;
    let supabase;

    const authHeader = req.headers.get("Authorization");
    const hasJwt = authHeader && authHeader.startsWith("Bearer ") && !authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__never__");

    if (hasJwt) {
      // Dashboard / authenticated user
      try {
        const ctx = await getAuthContext(req);
        orgId = ctx.orgId;
        supabase = createUserClient(req);
      } catch {
        return errorResponse("Unauthorized", 401);
      }
    } else if (orgIdParam) {
      // Retell live-call context — use service role
      orgId = orgIdParam;
      supabase = createServiceClient();
    } else {
      return errorResponse("Unauthorized — provide a JWT or org_id parameter", 401);
    }

    // ── Fetch calendar integration ──
    const { data: integrations } = await supabase
      .from("integrations")
      .select("service_name, config")
      .eq("org_id", orgId)
      .in("service_name", ["google_calendar", "outlook_calendar"])
      .eq("status", "connected");

    const busyPeriods: BusyPeriod[] = [];

    if (integrations && integrations.length > 0) {
      const integration = integrations[0];
      const config = integration.config as Record<string, string>;
      const accessToken = config?.access_token;

      if (accessToken) {
        if (integration.service_name === "google_calendar") {
          const periods = await getGoogleBusyPeriods(
            accessToken,
            date,
            date,
            DEFAULT_TIMEZONE
          );
          busyPeriods.push(...periods);
        } else if (integration.service_name === "outlook_calendar") {
          const periods = await getOutlookBusyPeriods(accessToken, date, date);
          busyPeriods.push(...periods);
        }
      }
    }

    // ── Fetch existing appointments for the date ──
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data: appointments } = await supabase
      .from("appointments")
      .select("scheduled_at, duration_minutes")
      .eq("org_id", orgId)
      .neq("status", "cancelled")
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    if (appointments) {
      for (const appt of appointments) {
        const start = new Date(appt.scheduled_at);
        const end = new Date(start.getTime() + (appt.duration_minutes ?? 30) * 60_000);
        busyPeriods.push({ start, end });
      }
    }

    // ── Compute available slots ──
    const availableSlots = computeAvailableSlots(
      date,
      durationMinutes,
      busyPeriods,
      DEFAULT_TIMEZONE
    );

    return jsonResponse({
      date,
      available_slots: availableSlots,
      timezone: DEFAULT_TIMEZONE,
    });
  } catch (error) {
    console.error("check-availability error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
