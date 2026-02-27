/**
 * Speech-friendly formatting helpers for AI voice agent responses.
 * All output is designed to be read aloud naturally by the Retell AI agent.
 */

// ── Ordinal suffix ──────────────────────────────────────────────────

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

// ── Time formatting ─────────────────────────────────────────────────

/**
 * Converts 24h time to speakable 12h format.
 * "14:00" → "2:00 PM"
 * "09:30" → "9:30 AM"
 */
export function formatTimeForSpeech(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";

  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${mStr} ${ampm}`;
}

// ── Date formatting ─────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Formats a date string for speech, relative to today when possible.
 * "2026-02-28" → "Saturday, February 28th" or "Today" / "Tomorrow"
 */
export function formatDateForSpeech(dateStr: string, timezone: string): string {
  const date = new Date(dateStr + "T12:00:00");

  // Get today/tomorrow in the given timezone
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: timezone });

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const dayOrd = ordinal(date.getDate());

  return `${dayName}, ${monthName} ${dayOrd}`;
}

/**
 * Combines date and time into a speakable string.
 * "Tuesday, February 28th at 2:00 PM"
 * "Today at 3:30 PM"
 */
export function formatDateTimeForSpeech(
  dateStr: string,
  time24: string,
  timezone: string
): string {
  const datePart = formatDateForSpeech(dateStr, timezone);
  const timePart = formatTimeForSpeech(time24);
  return `${datePart} at ${timePart}`;
}

// ── Speakable response generation ───────────────────────────────────

export interface SpeakableSlot {
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM"
}

export interface SpeakableParams {
  available: boolean;
  requestedTime: string | null;  // Already formatted, e.g. "Tuesday, February 28th at 2:00 PM"
  alternatives: SpeakableSlot[];
  timezone: string;
  reason?: string;
  isEarliestQuery: boolean;
  needsSelection?: boolean;  // true for range/day queries — present options and ask
}

/**
 * Generates a natural sentence for the AI agent to read aloud.
 */
export function generateSpeakableResponse(params: SpeakableParams): string {
  const { available, requestedTime, alternatives, timezone, reason, isEarliestQuery, needsSelection } = params;

  // Format alternatives for speech — use time-only when all on the same day
  const fmtAlts = alternatives.map((a) =>
    formatDateTimeForSpeech(a.date, a.time, timezone)
  );

  // Time-only versions for same-day options (more natural: "I have 12, 1, or 2" instead of full dates)
  const allSameDay = alternatives.length > 0 && alternatives.every((a) => a.date === alternatives[0].date);
  const fmtTimesOnly = alternatives.map((a) => formatTimeForSpeech(a.time));

  // ── Available at requested time (exact match only) ──
  if (available && requestedTime) {
    return `Great news! ${requestedTime} is available. Shall I book that for you?`;
  }

  // ── Range/general query — present options and ask for selection ──
  if (needsSelection && fmtAlts.length > 0) {
    if (allSameDay) {
      const dayLabel = formatDateForSpeech(alternatives[0].date, timezone);
      if (fmtTimesOnly.length === 1) {
        return `On ${dayLabel}, I have ${fmtTimesOnly[0]} available. Would that work for you?`;
      }
      const last = fmtTimesOnly[fmtTimesOnly.length - 1];
      const rest = fmtTimesOnly.slice(0, -1).join(", ");
      return `On ${dayLabel}, I have ${rest}, or ${last} available. Which works best for you?`;
    }
    // Multiple days
    if (fmtAlts.length === 1) {
      return `I have ${fmtAlts[0]} available. Would that work for you?`;
    }
    const last = fmtAlts[fmtAlts.length - 1];
    const rest = fmtAlts.slice(0, -1).join(", ");
    return `I have ${rest}, or ${last} available. Which works best for you?`;
  }

  // ── Earliest available query ──
  if (isEarliestQuery && fmtAlts.length > 0) {
    if (fmtAlts.length === 1) {
      return `The earliest I have available is ${fmtAlts[0]}. Would that work for you?`;
    }
    const last = fmtAlts[fmtAlts.length - 1];
    const rest = fmtAlts.slice(0, -1).join(", ");
    return `The earliest I have available is ${fmtAlts[0]}. I also have ${rest}, or ${last}. Which works best for you?`;
  }

  // ── Day not available ──
  if (reason === "day_not_available" && fmtAlts.length > 0) {
    const dayRef = requestedTime ?? "that day";
    if (fmtAlts.length === 1) {
      return `I'm sorry, we don't have availability on ${dayRef}. The closest I can offer is ${fmtAlts[0]}. Would that work?`;
    }
    const last = fmtAlts[fmtAlts.length - 1];
    const rest = fmtAlts.slice(0, -1).join(", ");
    return `I'm sorry, we don't have availability on ${dayRef}. The closest I can offer is ${rest}, or ${last}. Would any of those work?`;
  }

  // ── Specific time unavailable, alternatives offered ──
  if (!available && requestedTime && fmtAlts.length > 0) {
    if (fmtAlts.length === 1) {
      return `Unfortunately, ${requestedTime} is not available. I do have an opening at ${fmtAlts[0]}. Would that work instead?`;
    }
    const last = fmtAlts[fmtAlts.length - 1];
    const rest = fmtAlts.slice(0, -1).join(", ");
    return `Unfortunately, ${requestedTime} is not available. I do have openings at ${rest}, or ${last}. Would any of those work for you?`;
  }

  // ── No alternatives at all ──
  if (!available && fmtAlts.length === 0) {
    return "I'm sorry, I wasn't able to find any available time slots. Let me take down your preferred time and someone will follow up to get this scheduled.";
  }

  // ── Fallback ──
  if (fmtAlts.length > 0) {
    if (fmtAlts.length === 1) {
      return `I have ${fmtAlts[0]} available. Would that work for you?`;
    }
    const last = fmtAlts[fmtAlts.length - 1];
    const rest = fmtAlts.slice(0, -1).join(", ");
    return `I have ${rest}, or ${last} available. Which works best for you?`;
  }

  return "I apologize, but I'm unable to check the calendar right now. Let me take down your preferred time and someone will confirm shortly.";
}
