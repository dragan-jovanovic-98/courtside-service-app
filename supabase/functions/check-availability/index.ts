import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient, createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface BusyPeriod {
  start: Date;
  end: Date;
}

interface ScheduleSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface DaySchedule {
  enabled: boolean;
  slots: ScheduleSlot[];
}

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = "America/Toronto";

const DEFAULT_BUSINESS_HOURS: DaySchedule = {
  enabled: true,
  slots: [{ start: "09:00", end: "17:00" }],
};

// Mon=0..Sun=6 — default Mon-Fri enabled, Sat-Sun disabled
function getDefaultSchedule(dayOfWeek: number): DaySchedule {
  if (dayOfWeek >= 5) return { enabled: false, slots: [] }; // Sat/Sun
  return DEFAULT_BUSINESS_HOURS;
}

// ── Calendar API helpers ───────────────────────────────────────────

async function getGoogleBusyPeriods(
  accessToken: string,
  calendarId: string,
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
        items: [{ id: calendarId }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Google FreeBusy API error:", err);
    return [];
  }

  const data = await response.json();
  const busySlots = data.calendars?.[calendarId]?.busy ?? [];

  return busySlots.map((slot: { start: string; end: string }) => ({
    start: new Date(slot.start),
    end: new Date(slot.end),
  }));
}

async function getOutlookBusyPeriods(
  accessToken: string,
  calendarId: string,
  dateStart: string,
  dateEnd: string
): Promise<BusyPeriod[]> {
  const url = new URL(
    `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView`
  );
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

// ── Schedule helpers ──────────────────────────────────────────────

function getDaySchedule(
  scheduleRows: Array<{ day_of_week: number; enabled: boolean; slots: unknown }>,
  dayOfWeek: number
): DaySchedule {
  const row = scheduleRows.find((r) => r.day_of_week === dayOfWeek);
  if (!row) return getDefaultSchedule(dayOfWeek);
  return {
    enabled: row.enabled,
    slots: (row.slots as ScheduleSlot[]) ?? [],
  };
}

// ── Slot computation ───────────────────────────────────────────────

function computeAvailableSlots(
  date: string,
  durationMinutes: number,
  busyPeriods: BusyPeriod[],
  businessSlots: ScheduleSlot[]
): TimeSlot[] {
  if (businessSlots.length === 0) return [];

  const availableSlots: TimeSlot[] = [];

  for (const biz of businessSlots) {
    const bizStartMinutes = parseTimeToMinutes(biz.start);
    const bizEndMinutes = parseTimeToMinutes(biz.end);
    const totalMinutes = bizEndMinutes - bizStartMinutes;
    if (totalMinutes <= 0) continue;

    // Build minute-level occupancy for this business window
    const occupied = new Array(totalMinutes).fill(false);

    const businessStart = new Date(`${date}T${biz.start}:00`);
    const businessEnd = new Date(`${date}T${biz.end}:00`);

    for (const busy of busyPeriods) {
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

    // Walk through and collect free slots
    for (let m = 0; m <= totalMinutes - durationMinutes; m += durationMinutes) {
      let free = true;
      for (let d = 0; d < durationMinutes; d++) {
        if (occupied[m + d]) {
          free = false;
          break;
        }
      }
      if (free) {
        const startTotalMin = bizStartMinutes + m;
        const endTotalMin = startTotalMin + durationMinutes;
        availableSlots.push({
          start: minutesToTime(startTotalMin),
          end: minutesToTime(endTotalMin),
        });
      }
    }
  }

  return availableSlots;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// JS Date.getDay() returns 0=Sun..6=Sat
// Our schema uses 0=Mon..6=Sun
function jsDayToSchemaDow(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
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
    const campaignId = url.searchParams.get("campaign_id");
    const durationParam = url.searchParams.get("duration");
    const timezoneParam = url.searchParams.get("timezone");
    const orgIdParam = url.searchParams.get("org_id");

    if (!date) {
      return errorResponse("Missing required query parameter: date", 400);
    }
    if (!campaignId) {
      return errorResponse("Missing required query parameter: campaign_id", 400);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    const durationMinutes = durationParam ? parseInt(durationParam, 10) : 30;
    if (isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
      return errorResponse("Duration must be between 15 and 240 minutes.", 400);
    }

    const timezone = timezoneParam || DEFAULT_TIMEZONE;

    // ── Determine org and supabase client ──
    let orgId: string;
    let supabase;

    const authHeader = req.headers.get("Authorization");
    const hasJwt = authHeader && authHeader.startsWith("Bearer ") && !authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__never__");

    if (hasJwt) {
      try {
        const ctx = await getAuthContext(req);
        orgId = ctx.orgId;
        supabase = createUserClient(req);
      } catch {
        return errorResponse("Unauthorized", 401);
      }
    } else if (orgIdParam) {
      orgId = orgIdParam;
      supabase = createServiceClient();
    } else {
      return errorResponse("Unauthorized — provide a JWT or org_id parameter", 401);
    }

    // ── Fetch campaign's calendar connection ──
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, calendar_connection_id")
      .eq("id", campaignId)
      .eq("org_id", orgId)
      .single();

    if (campaignError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    const busyPeriods: BusyPeriod[] = [];

    // ── External calendar busy periods ──
    if (campaign.calendar_connection_id) {
      const { data: calConn } = await supabase
        .from("calendar_connections")
        .select("id, integration_id, provider, provider_calendar_id")
        .eq("id", campaign.calendar_connection_id)
        .single();

      if (calConn) {
        const providerType = calConn.provider as "google" | "outlook";
        const accessToken = await getValidAccessToken(calConn.integration_id, providerType);

        if (accessToken) {
          if (providerType === "google") {
            const periods = await getGoogleBusyPeriods(
              accessToken,
              calConn.provider_calendar_id,
              date,
              date,
              timezone
            );
            busyPeriods.push(...periods);
          } else if (providerType === "outlook") {
            const periods = await getOutlookBusyPeriods(
              accessToken,
              calConn.provider_calendar_id,
              date,
              date
            );
            busyPeriods.push(...periods);
          }
        }
      }
    }

    // ── Always fetch existing appointments for the date (Courtside Calendar) ──
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

    // ── Fetch business hours from campaign_appointment_schedules ──
    const { data: scheduleRows } = await supabase
      .from("campaign_appointment_schedules")
      .select("day_of_week, enabled, slots")
      .eq("campaign_id", campaignId);

    const jsDay = new Date(date + "T12:00:00").getDay();
    const schemaDow = jsDayToSchemaDow(jsDay);
    const daySchedule = getDaySchedule(scheduleRows ?? [], schemaDow);

    if (!daySchedule.enabled || daySchedule.slots.length === 0) {
      return jsonResponse({
        date,
        available_slots: [],
        timezone,
        reason: "day_not_available",
      });
    }

    // ── Compute available slots ──
    const availableSlots = computeAvailableSlots(
      date,
      durationMinutes,
      busyPeriods,
      daySchedule.slots
    );

    return jsonResponse({
      date,
      available_slots: availableSlots,
      timezone,
    });
  } catch (error) {
    console.error("check-availability error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
