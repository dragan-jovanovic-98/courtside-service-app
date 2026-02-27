import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getCalendarProvider } from "../_shared/calendar-providers.ts";
import type { BusyPeriod } from "../_shared/calendar-providers.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";
import { parseRequestedTime } from "../_shared/date-parser.ts";
import type { ParsedDateTime } from "../_shared/date-parser.ts";
import {
  formatTimeForSpeech,
  formatDateForSpeech,
  formatDateTimeForSpeech,
  generateSpeakableResponse,
} from "../_shared/speech.ts";
import type { SpeakableSlot } from "../_shared/speech.ts";
import { logToolCall, startTimer } from "../_shared/tool-logger.ts";

// ── Types ──────────────────────────────────────────────────────────

interface ScheduleSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface DaySchedule {
  enabled: boolean;
  slots: ScheduleSlot[];
}

interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

interface Alternative {
  time: string;      // "Tuesday, February 28 at 3:00 PM"
  timeISO: string;   // "2026-02-28T15:00:00-05:00"
  endTime: string;   // "3:30 PM"
  endTimeISO: string;
}

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = "America/Toronto";
const MAX_ALTERNATIVES = 3;

const DEFAULT_BUSINESS_HOURS: DaySchedule = {
  enabled: true,
  slots: [{ start: "09:00", end: "17:00" }],
};

// ── Helpers ────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseTimeToMinutes(time: string): number {
  // Handle both "HH:MM" (24h) and "H:MM AM/PM" (12h) formats
  const trimmed = time.trim();
  const isPM = /pm/i.test(trimmed);
  const isAM = /am/i.test(trimmed);
  const cleaned = trimmed.replace(/\s*(am|pm)\s*/i, "");
  const [h, m] = cleaned.split(":").map(Number);
  let hours = h;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + (m || 0);
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

// DB uses 0=Sun..6=Sat — same as JS Date.getDay()
// No conversion needed.

function getDefaultSchedule(dayOfWeek: number): DaySchedule {
  // 0=Sun, 6=Sat — weekends disabled by default
  if (dayOfWeek === 0 || dayOfWeek === 6) return { enabled: false, slots: [] };
  return DEFAULT_BUSINESS_HOURS;
}

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

function addMinutesToTime(time24: string, minutes: number): string {
  const totalMin = parseTimeToMinutes(time24) + minutes;
  return minutesToTime(totalMin);
}

/**
 * Apply buffer_minutes to busy periods — expand each busy period by buffer on both sides.
 */
function applyBuffer(busyPeriods: BusyPeriod[], bufferMinutes: number): BusyPeriod[] {
  if (bufferMinutes <= 0) return busyPeriods;
  const bufferMs = bufferMinutes * 60_000;
  return busyPeriods.map((bp) => ({
    start: new Date(bp.start.getTime() - bufferMs),
    end: new Date(bp.end.getTime() + bufferMs),
  }));
}

/**
 * Compute available time slots for a given date, excluding busy periods.
 */
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

    const occupied = new Array(totalMinutes).fill(false);
    const businessStart = new Date(`${date}T${biz.start}:00`);
    const businessEnd = new Date(`${date}T${biz.end}:00`);

    for (const busy of busyPeriods) {
      const bStart = busy.start < businessStart ? businessStart : busy.start;
      const bEnd = busy.end > businessEnd ? businessEnd : busy.end;
      if (bStart >= bEnd) continue;

      const startMin = Math.floor((bStart.getTime() - businessStart.getTime()) / 60_000);
      const endMin = Math.ceil((bEnd.getTime() - businessStart.getTime()) / 60_000);

      for (let m = Math.max(0, startMin); m < Math.min(totalMinutes, endMin); m++) {
        occupied[m] = true;
      }
    }

    for (let m = 0; m <= totalMinutes - durationMinutes; m += durationMinutes) {
      let free = true;
      for (let d = 0; d < durationMinutes; d++) {
        if (occupied[m + d]) { free = false; break; }
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

/**
 * Filter slots that are past the minimum notice threshold.
 */
function filterPastSlots(
  slots: TimeSlot[],
  date: string,
  minNoticeHours: number,
  timezone: string
): TimeSlot[] {
  const now = new Date();
  const cutoffMs = now.getTime() + minNoticeHours * 3600_000;

  return slots.filter((slot) => {
    // Parse slot start in the campaign timezone
    const slotStr = `${date}T${slot.start}:00`;
    const slotDate = new Date(slotStr);
    // Approximate: if the slot time in local timezone is past cutoff, exclude it
    // Use the timezone offset to compute
    const offset = getTimezoneOffset(slotDate, timezone);
    const isoStr = `${date}T${slot.start}:00${offset}`;
    const slotUtc = new Date(isoStr);
    return slotUtc.getTime() >= cutoffMs;
  });
}

/**
 * Filter slots to only include those within a time range.
 */
function filterSlotsByRange(
  slots: TimeSlot[],
  rangeStart: string | null,
  rangeEnd: string | null
): TimeSlot[] {
  if (!rangeStart && !rangeEnd) return slots;
  const startMin = rangeStart ? parseTimeToMinutes(rangeStart) : 0;
  const endMin = rangeEnd ? parseTimeToMinutes(rangeEnd) : 24 * 60;

  return slots.filter((slot) => {
    const slotStart = parseTimeToMinutes(slot.start);
    return slotStart >= startMin && slotStart < endMin;
  });
}

/**
 * Build an Alternative object from a date + time slot.
 */
function buildAlternative(
  date: string,
  slot: TimeSlot,
  timezone: string
): Alternative {
  return {
    time: formatDateTimeForSpeech(date, slot.start, timezone),
    timeISO: buildISO(date, slot.start, timezone),
    endTime: formatTimeForSpeech(slot.end),
    endTimeISO: buildISO(date, slot.end, timezone),
  };
}

// ── Service auth check ─────────────────────────────────────────────

function decodeBase64Url(str: string): string {
  // Clean: trim whitespace, remove newlines, convert base64url → base64
  let b64 = str.trim().replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (b64.length % 4) b64 += "=";
  // Decode using Uint8Array for robustness
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(binary);
}

function verifyServiceAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  // Strip Bearer prefix, trim whitespace/newlines
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Direct comparison
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token === serviceKey) return true;

  // Decode JWT and check role claim
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

// ── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Auth: service role key required (Retell calls this)
    if (!verifyServiceAuth(req)) {
      return errorResponse("Unauthorized — service role key required", 401);
    }

    const elapsed = startTimer();
    const rawBody = await req.json();

    // Retell sends { name, args, call } — extract accordingly
    // Also support flat body for direct/testing calls
    const isRetell = rawBody.args !== undefined || rawBody.call !== undefined;
    const args = isRetell ? (rawBody.args ?? {}) : rawBody;
    const callObj = rawBody.call ?? {};
    const meta = callObj.metadata ?? {};
    const dynVars = callObj.retell_llm_dynamic_variables ?? {};

    // Tool parameters from args
    const requested_time_string = args.requested_time_string;
    const timezoneOverride = args.timezone;
    const durationOverride = args.duration_minutes;

    // Context from call metadata/dynamic vars (set when creating the Retell call)
    const campaign_id = args.campaign_id || meta.campaign_id || dynVars.campaign_id;
    const org_id = args.org_id || meta.org_id || dynVars.org_id;
    const lead_id = args.lead_id || meta.lead_id || dynVars.lead_id;
    const contact_id = args.contact_id || meta.contact_id || dynVars.contact_id;
    const call_metadata = isRetell ? { call_id: callObj.call_id } : rawBody.call_metadata;

    if (!campaign_id) {
      return errorResponse("campaign_id is required — pass it in Retell call metadata when creating the call", 400);
    }
    if (!org_id) {
      return errorResponse("org_id is required — pass it in Retell call metadata when creating the call", 400);
    }

    const logInput = { campaign_id, org_id, requested_time_string, lead_id, contact_id };
    const callId = call_metadata?.call_id ?? null;

    const supabase = createServiceClient();

    // ── Resolve campaign context ──
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id, org_id, calendar_connection_id, default_meeting_duration, " +
        "max_advance_days, min_notice_hours, booking_enabled, timezone"
      )
      .eq("id", campaign_id)
      .eq("org_id", org_id)
      .single();

    if (campaignError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    // Resolve timezone: override > campaign > org > default
    let timezone = timezoneOverride || campaign.timezone;
    if (!timezone) {
      const { data: org } = await supabase
        .from("organizations")
        .select("timezone")
        .eq("id", org_id)
        .single();
      timezone = org?.timezone || DEFAULT_TIMEZONE;
    }

    const durationMinutes = durationOverride || campaign.default_meeting_duration || 30;
    const maxAdvanceDays = campaign.max_advance_days || 14;
    const minNoticeHours = campaign.min_notice_hours || 2;

    // ── Fetch business hours ──
    const { data: scheduleRows } = await supabase
      .from("campaign_appointment_schedules")
      .select("day_of_week, enabled, slots, buffer_minutes")
      .eq("campaign_id", campaign_id);

    const bufferMinutes = scheduleRows?.[0]?.buffer_minutes ?? 0;

    // ── Parse the requested time ──
    const parsed: ParsedDateTime = parseRequestedTime(
      requested_time_string,
      timezone,
      undefined,
      maxAdvanceDays
    );

    // ── Resolve calendar connection ──
    let calendarProvider: "google" | "outlook" | null = null;
    let accessToken: string | null = null;
    let calendarId: string | null = null;

    if (campaign.calendar_connection_id) {
      const { data: calConn } = await supabase
        .from("calendar_connections")
        .select("id, integration_id, provider, provider_calendar_id")
        .eq("id", campaign.calendar_connection_id)
        .single();

      if (calConn) {
        calendarProvider = calConn.provider as "google" | "outlook";
        calendarId = calConn.provider_calendar_id;

        try {
          accessToken = await getValidAccessToken(calConn.integration_id, calendarProvider);
        } catch (err) {
          console.error("Failed to get calendar access token:", err);
        }

        // If token refresh failed / needs reauth
        if (!accessToken) {
          const resp = {
            available: null,
            error: "calendar_auth_expired",
            speakableResponse:
              "I apologize, but I'm unable to access the calendar at this moment. " +
              "Let me note your preferred time and we'll confirm your appointment shortly.",
            meta: {
              campaign_id,
              fallback: "manual_confirmation",
            },
          };
          logToolCall({ tool_name: "agent-check-availability", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: resp, duration_ms: elapsed(), calendar_provider: calendarProvider, error: "calendar_auth_expired" });
          return jsonResponse(resp);
        }
      }
    }

    // ── Collect available slots across search dates ──
    const allAlternatives: Array<{ date: string; slot: TimeSlot }> = [];
    let slotsChecked = 0;
    let requestedSlotAvailable = false;

    // For "exact" confidence, we only need to check the single date
    // For others, iterate through searchDates
    const datesToSearch = parsed.searchDates;

    // Batch fetch external busy periods for the full range
    let externalBusyPeriods: BusyPeriod[] = [];
    if (accessToken && calendarId && calendarProvider && datesToSearch.length > 0) {
      const rangeStart = datesToSearch[0];
      const rangeEnd = datesToSearch[datesToSearch.length - 1];

      try {
        const provider = getCalendarProvider(calendarProvider);
        externalBusyPeriods = await provider.getBusyPeriods(
          accessToken,
          calendarId,
          rangeStart,
          rangeEnd,
          timezone
        );
      } catch (err) {
        console.error("Calendar API error:", err);
        // Continue with Courtside-only availability
      }
    }

    // Fetch all Courtside appointments for the date range
    let courtsideAppointments: Array<{ scheduled_at: string; duration_minutes: number | null }> = [];
    if (datesToSearch.length > 0) {
      const rangeStart = `${datesToSearch[0]}T00:00:00`;
      const rangeEnd = `${datesToSearch[datesToSearch.length - 1]}T23:59:59`;

      const { data: appts } = await supabase
        .from("appointments")
        .select("scheduled_at, duration_minutes")
        .eq("org_id", org_id)
        .neq("status", "cancelled")
        .gte("scheduled_at", rangeStart)
        .lte("scheduled_at", rangeEnd);

      courtsideAppointments = appts ?? [];
    }

    // Convert Courtside appointments to busy periods
    const courtsideBusy: BusyPeriod[] = courtsideAppointments.map((appt) => {
      const start = new Date(appt.scheduled_at);
      const end = new Date(start.getTime() + (appt.duration_minutes ?? 30) * 60_000);
      return { start, end };
    });

    // Merge all busy periods and apply buffer
    const allBusy = applyBuffer(
      [...externalBusyPeriods, ...courtsideBusy],
      bufferMinutes
    );

    // ── Search each date ──
    for (const dateStr of datesToSearch) {
      const dow = new Date(dateStr + "T12:00:00").getDay();
      const daySchedule = getDaySchedule(scheduleRows ?? [], dow);

      if (!daySchedule.enabled || daySchedule.slots.length === 0) {
        continue;
      }

      let slots = computeAvailableSlots(dateStr, durationMinutes, allBusy, daySchedule.slots);
      slots = filterPastSlots(slots, dateStr, minNoticeHours, timezone);

      // Apply range filter if parsed result has a range
      if (parsed.rangeStart || parsed.rangeEnd) {
        slots = filterSlotsByRange(slots, parsed.rangeStart, parsed.rangeEnd);
      }

      slotsChecked += slots.length;

      // If exact time requested, check if that specific slot matches
      if (parsed.confidence === "exact" && parsed.time && parsed.date === dateStr) {
        const exactMatch = slots.find((s) => s.start === parsed.time);
        if (exactMatch) {
          requestedSlotAvailable = true;
        }
      }

      // Collect alternatives
      for (const slot of slots) {
        // Skip the exact requested slot (it's the primary, not an alternative)
        if (parsed.confidence === "exact" && parsed.time === slot.start && parsed.date === dateStr && requestedSlotAvailable) {
          continue;
        }
        allAlternatives.push({ date: dateStr, slot });
        if (allAlternatives.length >= MAX_ALTERNATIVES && requestedSlotAvailable) break;
      }

      // Stop searching if we have enough
      if (allAlternatives.length >= MAX_ALTERNATIVES) break;
    }

    // ── Build response ──
    const isEarliestQuery = parsed.confidence === "none_requested";

    // Format the requested time for display
    let requestedTimeFormatted: string | null = null;
    let requestedTimeISO: string | null = null;
    if (parsed.confidence === "exact" && parsed.date && parsed.time) {
      requestedTimeFormatted = formatDateTimeForSpeech(parsed.date, parsed.time, timezone);
      requestedTimeISO = buildISO(parsed.date, parsed.time, timezone);
    } else if (parsed.confidence === "day_only" && parsed.date) {
      requestedTimeFormatted = formatDateForSpeech(parsed.date, timezone);
    }

    // Format alternatives
    const alternatives: Alternative[] = allAlternatives
      .slice(0, MAX_ALTERNATIVES)
      .map(({ date, slot }) => buildAlternative(date, slot, timezone));

    // Build speakable slots for the speech generator
    const speakableAlts: SpeakableSlot[] = allAlternatives
      .slice(0, MAX_ALTERNATIVES)
      .map(({ date, slot }) => ({ date, time: slot.start }));

    // Determine reason
    let reason: string | undefined;
    if (parsed.confidence === "day_only" && allAlternatives.length === 0) {
      // The specific day had no availability — check if it was because the day was disabled
      if (parsed.date) {
        const dow = new Date(parsed.date + "T12:00:00").getDay();
        const daySchedule = getDaySchedule(scheduleRows ?? [], dow);
        if (!daySchedule.enabled) {
          reason = "day_not_available";
          // Search forward for alternatives
          const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
          const extraDates: string[] = [];
          const startDate = new Date(parsed.date + "T12:00:00");
          for (let i = 1; i <= maxAdvanceDays; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            extraDates.push(ds);
          }

          for (const dateStr of extraDates) {
            const dow2 = new Date(dateStr + "T12:00:00").getDay();
            const daySch = getDaySchedule(scheduleRows ?? [], dow2);
            if (!daySch.enabled || daySch.slots.length === 0) continue;

            let extraSlots = computeAvailableSlots(dateStr, durationMinutes, allBusy, daySch.slots);
            extraSlots = filterPastSlots(extraSlots, dateStr, minNoticeHours, timezone);

            for (const slot of extraSlots) {
              alternatives.push(buildAlternative(dateStr, slot, timezone));
              speakableAlts.push({ date: dateStr, time: slot.start });
              if (alternatives.length >= MAX_ALTERNATIVES) break;
            }
            if (alternatives.length >= MAX_ALTERNATIVES) break;
          }
        }
      }
    }

    // ── Exact time available ──
    if (requestedSlotAvailable && parsed.date && parsed.time) {
      const endTime = addMinutesToTime(parsed.time, durationMinutes);
      const speakable = generateSpeakableResponse({
        available: true,
        requestedTime: requestedTimeFormatted,
        alternatives: [],
        timezone,
        isEarliestQuery: false,
      });

      const resp = {
        available: true,
        requestedTime: requestedTimeFormatted,
        requestedTimeISO,
        endTime: formatTimeForSpeech(endTime),
        endTimeISO: buildISO(parsed.date, endTime, timezone),
        duration_minutes: durationMinutes,
        timezone,
        alternatives: null,
        speakableResponse: speakable,
        meta: {
          campaign_id,
          calendar_provider: calendarProvider,
          slots_checked: slotsChecked,
          parse_confidence: parsed.confidence,
        },
      };
      logToolCall({ tool_name: "agent-check-availability", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { available: true, parse_confidence: parsed.confidence }, duration_ms: elapsed(), calendar_provider: calendarProvider });
      return jsonResponse(resp);
    }

    // ── Earliest available / range / day_only — present options, require selection ──
    if (isEarliestQuery || parsed.confidence === "range" || parsed.confidence === "day_only") {
      const hasAlts = alternatives.length > 0;
      const speakable = generateSpeakableResponse({
        available: false,  // never "available" for general queries — agent must ask
        requestedTime: requestedTimeFormatted,
        alternatives: speakableAlts,
        timezone,
        reason,
        isEarliestQuery,
        needsSelection: hasAlts,  // signal to present options conversationally
      });

      logToolCall({ tool_name: "agent-check-availability", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { available: false, needs_selection: hasAlts, alternatives_count: alternatives.length, parse_confidence: parsed.confidence }, duration_ms: elapsed(), calendar_provider: calendarProvider });
      return jsonResponse({
        available: false,
        needs_selection: hasAlts,  // tells Retell agent: present options, ask which one
        requestedTime: requestedTimeFormatted,
        requestedTimeISO: null,
        duration_minutes: durationMinutes,
        timezone,
        alternatives: hasAlts ? alternatives : null,
        speakableResponse: speakable,
        meta: {
          campaign_id,
          calendar_provider: calendarProvider,
          slots_checked: slotsChecked,
          parse_confidence: parsed.confidence,
          ...(reason && { reason }),
        },
      });
    }

    // ── Exact time NOT available — offer alternatives ──
    const speakable = generateSpeakableResponse({
      available: false,
      requestedTime: requestedTimeFormatted,
      alternatives: speakableAlts,
      timezone,
      isEarliestQuery: false,
    });

    logToolCall({ tool_name: "agent-check-availability", org_id, campaign_id, call_id: callId, lead_id, input: logInput, output: { available: false, alternatives_count: alternatives.length, parse_confidence: parsed.confidence }, duration_ms: elapsed(), calendar_provider: calendarProvider });
    return jsonResponse({
      available: false,
      requestedTime: requestedTimeFormatted,
      requestedTimeISO,
      duration_minutes: durationMinutes,
      timezone,
      alternatives: alternatives.length > 0 ? alternatives : null,
      speakableResponse: speakable,
      meta: {
        campaign_id,
        calendar_provider: calendarProvider,
        slots_checked: slotsChecked,
        parse_confidence: parsed.confidence,
      },
    });
  } catch (error) {
    console.error("agent-check-availability error:", error);
    logToolCall({ tool_name: "agent-check-availability", org_id: "unknown", input: {}, output: {}, duration_ms: 0, error: error.message ?? "Internal server error" });
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
