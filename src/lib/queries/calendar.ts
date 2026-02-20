import { createClient } from "@/lib/supabase/server";
import type { CalendarAppointmentData } from "@/types";
import { fullName, formatTime, formatDuration } from "@/lib/format";

export async function getAppointmentsByMonth(
  year: number,
  month: number
): Promise<Record<number, CalendarAppointmentData[]>> {
  const supabase = await createClient();

  // Month is 1-indexed (1=Jan, 2=Feb, etc)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, duration_minutes, notes, status, contacts(first_name, last_name, phone, company), campaigns(name), calls(duration_seconds, ai_summary)"
    )
    .gte("scheduled_at", startDate.toISOString())
    .lte("scheduled_at", endDate.toISOString())
    .order("scheduled_at", { ascending: true });

  const grouped: Record<number, CalendarAppointmentData[]> = {};

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const contact = r.contacts as {
      first_name: string;
      last_name: string | null;
      phone: string;
      company: string | null;
    } | null;
    const campaign = r.campaigns as { name: string } | null;
    const calls = r.calls as {
      duration_seconds: number | null;
      ai_summary: string | null;
    } | null;

    const scheduledAt = r.scheduled_at as string;
    const dayOfMonth = new Date(scheduledAt).getDate();

    const appt: CalendarAppointmentData = {
      id: r.id as string,
      time: formatTime(scheduledAt),
      name: contact
        ? fullName(contact.first_name, contact.last_name)
        : "Unknown",
      company: contact?.company ?? null,
      phone: contact?.phone ?? "",
      campaign: campaign?.name ?? "—",
      duration: calls?.duration_seconds
        ? formatDuration(calls.duration_seconds)
        : `${r.duration_minutes ?? 30}min`,
      summary: calls?.ai_summary ?? (r.notes as string | null),
      scheduledAt,
    };

    if (!grouped[dayOfMonth]) grouped[dayOfMonth] = [];
    grouped[dayOfMonth].push(appt);
  }

  return grouped;
}

export async function getCalendarStats(year: number, month: number) {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Week boundaries (Sunday-Saturday containing today)
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Month boundaries
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [todayRes, weekRes, monthRes, showedRes, totalPastRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString()),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString()),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString()),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "showed")
        .lte("scheduled_at", todayEnd.toISOString()),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .lte("scheduled_at", todayEnd.toISOString()),
    ]);

  const showed = showedRes.count ?? 0;
  const totalPast = totalPastRes.count ?? 0;
  const showRate = totalPast > 0 ? Math.round((showed / totalPast) * 100) : 0;

  return {
    today: todayRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
    showRate: `${showRate}%`,
  };
}
