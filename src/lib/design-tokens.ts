/**
 * Courtside AI Design Tokens
 *
 * These match the prototype's T object and are used for dynamic styling
 * where Tailwind classes aren't sufficient (e.g., inline styles, chart colors).
 * For most use cases, prefer the Tailwind custom colors defined in globals.css.
 */

export const tokens = {
  // Backgrounds
  bg: "#0e1117",
  bgSide: "#0a0d12",
  bgCard: "rgba(255,255,255,0.025)",
  bgCardHover: "rgba(255,255,255,0.045)",
  bgInput: "rgba(255,255,255,0.04)",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.04)",

  // Text
  text: "#e8eaed",
  textMuted: "rgba(255,255,255,0.5)",
  textDim: "rgba(255,255,255,0.3)",
  textFaint: "rgba(255,255,255,0.15)",

  // Emerald (primary accent)
  emerald: "#34d399",
  emeraldDark: "#059669",
  emeraldBg: "rgba(52,211,153,0.08)",
  emeraldBgStrong: "rgba(52,211,153,0.15)",

  // Amber (warnings/callbacks)
  amber: "#fbbf24",
  amberBg: "rgba(251,191,36,0.12)",

  // Blue (info/interested)
  blue: "#60a5fa",
  blueBg: "rgba(96,165,250,0.12)",

  // Red (errors/negative)
  red: "#f87171",
  redBg: "rgba(248,113,113,0.12)",

  // Purple (special)
  purple: "#a78bfa",
  purpleBg: "rgba(167,139,250,0.12)",
} as const;

/** Accent color border-top opacity for stat cards (40% of accent) */
export const accentBorderStyle = (color: string) =>
  `2px solid ${color}40` as const;

/** Map of call outcomes to badge color variants */
export const outcomeBadgeColor: Record<string, BadgeColor> = {
  booked: "emerald",
  interested: "blue",
  callback: "amber",
  voicemail: "default",
  no_answer: "default",
  not_interested: "red",
  wrong_number: "red",
  dnc: "red",
};

/** Map of campaign statuses to badge color variants */
export const campaignBadgeColor: Record<string, BadgeColor> = {
  active: "emerald",
  paused: "amber",
  completed: "blue",
  draft: "default",
};

/** Map of lead statuses to badge color variants */
export const leadBadgeColor: Record<string, BadgeColor> = {
  new: "default",
  contacted: "default",
  interested: "blue",
  appt_set: "emerald",
  showed: "emerald",
  closed_won: "emerald",
  closed_lost: "red",
  bad_lead: "red",
};

export type BadgeColor =
  | "default"
  | "emerald"
  | "amber"
  | "blue"
  | "red"
  | "purple";
