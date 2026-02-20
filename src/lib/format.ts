/**
 * Shared formatting helpers for Courtside AI
 */

/** 272 -> "4:32" */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** ISO date string -> "12m ago", "2h ago", "Yesterday", "Feb 14" */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** ISO date string -> "2:00 PM" */
export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** 127500 -> "$127.5K", 950 -> "$950" */
export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/** "Sarah" + "Mitchell" -> "Sarah Mitchell" */
export function fullName(first: string, last: string | null): string {
  return last ? `${first} ${last}` : first;
}

/** ISO date string -> "Today 8:12 AM" / "Yest 6:18 PM" / "Feb 14 2:00 PM" */
export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const time = formatTime(isoDate);

  if (date.toDateString() === now.toDateString()) return `Today ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yest ${time}`;

  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${label} ${time}`;
}
