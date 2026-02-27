/**
 * Natural language date/time parsing for AI voice agent calendar requests.
 * Uses chrono-node for NLP parsing, with custom pre-processing for
 * domain-specific patterns (time-of-day periods, "after X", "earliest available").
 *
 * All parsing is timezone-aware. Output ISO strings include the timezone offset.
 */

import * as chrono from "npm:chrono-node@2.7.7";

// ── Types ──────────────────────────────────────────────────────────

export interface ParsedDateTime {
  /** The parsed date — null if "earliest available" or unparseable */
  date: string | null;           // "2026-02-28" (YYYY-MM-DD)
  /** The parsed time — null if day-only */
  time: string | null;           // "14:00" (HH:MM)
  /** Full ISO 8601 with timezone offset — null if no specific time */
  dateTimeISO: string | null;    // "2026-02-28T14:00:00-05:00"

  /** Classification of what was parsed */
  confidence: "exact" | "day_only" | "range" | "relative" | "none_requested";

  /** For range inputs ("tomorrow morning", "after 4pm") */
  rangeStart: string | null;     // "09:00"
  rangeEnd: string | null;       // "12:00"

  /** Human-readable version of what was parsed */
  speakableTime: string | null;  // "Tuesday, February 28 at 2:00 PM"

  /** Dates to search for available slots */
  searchDates: string[];         // ["2026-02-28"] or multiple days
}

// ── Constants ──────────────────────────────────────────────────────

const EARLIEST_PATTERNS = [
  /^$/,
  /^\s*$/,
  /earliest\s*(available)?/i,
  /as\s*soon\s*as\s*possible/i,
  /asap/i,
  /soonest/i,
  /first\s*available/i,
  /next\s*available/i,
  /whenever/i,
  /anything\s*(available|open)/i,
];

const TIME_OF_DAY: Record<string, { start: string; end: string }> = {
  morning: { start: "09:00", end: "12:00" },
  afternoon: { start: "12:00", end: "17:00" },
  evening: { start: "17:00", end: "20:00" },
};

const AFTER_PATTERN = /(?:after|past)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const BEFORE_PATTERN = /(?:before|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const NEXT_WEEK_PATTERN = /next\s+week/i;
const AM_PM_SUFFIX = /\b(am|pm)\b/i;
const TIME_OF_DAY_PATTERN = /\b(morning|afternoon|evening)\b/i;

// ── Timezone helpers ───────────────────────────────────────────────

/**
 * Returns the UTC offset string for a given IANA timezone at a specific date.
 * e.g., "America/Toronto" → "-05:00" (winter) or "-04:00" (summer)
 */
function getTimezoneOffset(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });

  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (!tzPart) return "+00:00";

  // Format is like "GMT-05:00" or "GMT+05:30" or "GMT" (for UTC)
  const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
  if (!match) return "+00:00";
  return match[1];
}

/**
 * Returns today's date string (YYYY-MM-DD) in the given timezone.
 */
function getTodayInTimezone(timezone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Returns a Date object representing the current moment in the given timezone
 * context (for chrono reference).
 */
function getReferenceDate(timezone: string, referenceDate?: Date): Date {
  if (referenceDate) return referenceDate;
  // Create a reference date that chrono interprets in the target timezone
  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: timezone });
  return new Date(localStr);
}

/**
 * Builds an ISO 8601 string with timezone offset.
 */
function buildISO(dateStr: string, time24: string, timezone: string): string {
  const date = new Date(`${dateStr}T${time24}:00`);
  const offset = getTimezoneOffset(date, timezone);
  return `${dateStr}T${time24}:00${offset}`;
}

/**
 * Pads a number to 2 digits.
 */
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Converts a Date to "YYYY-MM-DD" in the given timezone.
 */
function dateToDateStr(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Extracts "YYYY-MM-DD" from a chrono result Date using UTC methods.
 * Chrono was given a timezone-shifted reference, so its output Date
 * has campaign-local time in its UTC fields. Using toLocaleDateString
 * would double-apply the timezone offset.
 */
function chronoDateToDateStr(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Converts a Date to "HH:MM" in the given timezone.
 */
function dateToTimeStr(date: Date, timezone: string): string {
  const h = parseInt(
    date.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false }),
    10
  );
  const m = parseInt(
    date.toLocaleString("en-US", { timeZone: timezone, minute: "numeric" }),
    10
  );
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Returns an array of YYYY-MM-DD date strings for the next N calendar days,
 * starting from `startDate`.
 */
function getDateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const d = new Date(startDate + "T12:00:00");
  for (let i = 0; i < days; i++) {
    dates.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    );
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Returns date strings for next week (Mon-Fri) relative to the given date.
 */
function getNextWeekDates(todayStr: string): string[] {
  const today = new Date(todayStr + "T12:00:00");
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Days until next Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    );
  }
  return dates;
}

/**
 * Parse a simple time string like "4pm", "4:30 pm", "16:00" into "HH:MM".
 */
function parseSimpleTime(timeStr: string): string | null {
  const cleaned = timeStr.trim().toLowerCase();

  // Handle "4pm", "4 pm", "4:30pm", "4:30 pm"
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];

  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

// ── Main parser ────────────────────────────────────────────────────

export function parseRequestedTime(
  input: string | null | undefined,
  timezone: string,
  referenceDate?: Date,
  maxAdvanceDays: number = 14
): ParsedDateTime {
  const raw = (input ?? "").trim();
  const today = getTodayInTimezone(timezone);
  const ref = getReferenceDate(timezone, referenceDate);

  // ── 1. Empty / "earliest available" ──
  if (!raw || EARLIEST_PATTERNS.some((p) => p.test(raw))) {
    return {
      date: null,
      time: null,
      dateTimeISO: null,
      confidence: "none_requested",
      rangeStart: null,
      rangeEnd: null,
      speakableTime: null,
      searchDates: getDateRange(today, maxAdvanceDays),
    };
  }

  // ── 2. "Next week" ──
  if (NEXT_WEEK_PATTERN.test(raw)) {
    // Check if there's also a time-of-day modifier
    const todMatch = raw.match(TIME_OF_DAY_PATTERN);
    const range = todMatch ? TIME_OF_DAY[todMatch[1].toLowerCase()] : null;

    return {
      date: null,
      time: null,
      dateTimeISO: null,
      confidence: "range",
      rangeStart: range?.start ?? null,
      rangeEnd: range?.end ?? null,
      speakableTime: null,
      searchDates: getNextWeekDates(today),
    };
  }

  // ── 3. "After X" pattern ──
  const afterMatch = raw.match(AFTER_PATTERN);
  if (afterMatch) {
    const parsedTime = parseSimpleTime(afterMatch[1]);
    if (parsedTime) {
      // Determine which day — use chrono to see if a day is mentioned
      const chronoResult = chrono.parse(raw, ref, { forwardDate: true });
      let targetDate = today;

      if (chronoResult.length > 0 && chronoResult[0].start.isCertain("day")) {
        const d = chronoResult[0].start.date();
        targetDate = chronoDateToDateStr(d);
      } else {
        // If it's already past this time today, use tomorrow
        const nowTime = dateToTimeStr(new Date(), timezone);
        if (parsedTime <= nowTime) {
          const tomorrow = new Date(today + "T12:00:00");
          tomorrow.setDate(tomorrow.getDate() + 1);
          targetDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
        }
      }

      return {
        date: targetDate,
        time: null,
        dateTimeISO: null,
        confidence: "range",
        rangeStart: parsedTime,
        rangeEnd: "23:59",
        speakableTime: null,
        searchDates: [targetDate],
      };
    }
  }

  // ── 4. "Before X" pattern ──
  const beforeMatch = raw.match(BEFORE_PATTERN);
  if (beforeMatch) {
    const parsedTime = parseSimpleTime(beforeMatch[1]);
    if (parsedTime) {
      const chronoResult = chrono.parse(raw, ref, { forwardDate: true });
      let targetDate = today;

      if (chronoResult.length > 0 && chronoResult[0].start.isCertain("day")) {
        const d = chronoResult[0].start.date();
        targetDate = chronoDateToDateStr(d);
      }

      return {
        date: targetDate,
        time: null,
        dateTimeISO: null,
        confidence: "range",
        rangeStart: "00:00",
        rangeEnd: parsedTime,
        speakableTime: null,
        searchDates: [targetDate],
      };
    }
  }

  // ── 5. Time-of-day with a day reference ("Tuesday morning", "tomorrow afternoon") ──
  const todMatch = raw.match(TIME_OF_DAY_PATTERN);
  if (todMatch) {
    const period = TIME_OF_DAY[todMatch[1].toLowerCase()];
    // Strip the time-of-day word and parse the rest for the date
    const dateOnly = raw.replace(TIME_OF_DAY_PATTERN, "").trim();
    let targetDate = today;

    if (dateOnly) {
      const chronoResult = chrono.parse(dateOnly, ref, { forwardDate: true });
      if (chronoResult.length > 0) {
        const d = chronoResult[0].start.date();
        targetDate = chronoDateToDateStr(d);
      }
    }

    // If no day specified and it's already past the period end, use tomorrow
    if (!dateOnly || dateOnly.toLowerCase() === "today") {
      const nowTime = dateToTimeStr(new Date(), timezone);
      if (period.end <= nowTime && targetDate === today) {
        const tomorrow = new Date(today + "T12:00:00");
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
      }
    }

    return {
      date: targetDate,
      time: null,
      dateTimeISO: null,
      confidence: "range",
      rangeStart: period.start,
      rangeEnd: period.end,
      speakableTime: null,
      searchDates: [targetDate],
    };
  }

  // ── 6. chrono-node parse (general NLP) ──
  const results = chrono.parse(raw, ref, { forwardDate: true });

  if (results.length > 0) {
    const result = results[0];
    const startDate = result.start.date();

    // IMPORTANT: chrono was given a timezone-shifted reference date (local time
    // stuffed into a UTC Date via getReferenceDate). So chrono's output Date
    // already represents campaign-local time in its UTC fields. We must extract
    // hours/minutes using UTC methods to avoid double-applying the timezone offset.
    const parsedDateStr = `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth() + 1)}-${pad(startDate.getUTCDate())}`;

    // Check if we got a specific time
    const hasTime =
      result.start.isCertain("hour") ||
      AM_PM_SUFFIX.test(raw) ||
      /\d{1,2}:\d{2}/.test(raw);

    if (hasTime) {
      // Extract time using UTC methods (chrono output is already in local frame)
      const timeStr = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}`;
      const iso = buildISO(parsedDateStr, timeStr, timezone);

      return {
        date: parsedDateStr,
        time: timeStr,
        dateTimeISO: iso,
        confidence: "exact",
        rangeStart: null,
        rangeEnd: null,
        speakableTime: null, // Caller will format using speech.ts
        searchDates: [parsedDateStr],
      };
    }

    // Day-only (e.g., "Friday", "March 1st")
    return {
      date: parsedDateStr,
      time: null,
      dateTimeISO: null,
      confidence: "day_only",
      rangeStart: null,
      rangeEnd: null,
      speakableTime: null,
      searchDates: [parsedDateStr],
    };
  }

  // ── 7. Fallback — couldn't parse, treat as "earliest available" ──
  return {
    date: null,
    time: null,
    dateTimeISO: null,
    confidence: "none_requested",
    rangeStart: null,
    rangeEnd: null,
    speakableTime: null,
    searchDates: getDateRange(today, maxAdvanceDays),
  };
}
