import { getAppointmentsByMonth, getCalendarStats } from "@/lib/queries/calendar";
import { getCalendarConnections } from "@/lib/queries/integrations";
import { CalendarClient } from "./_components/calendar-client";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  const [appointmentsByDay, stats, calendarConnections, params] = await Promise.all([
    getAppointmentsByMonth(year, month),
    getCalendarStats(year, month),
    getCalendarConnections(),
    searchParams,
  ]);

  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarSources = calendarConnections.map((cc) => ({
    id: cc.id,
    name: cc.calendar_name ?? "Calendar",
    provider: (cc.integrations as { service_name: string } | null)?.service_name ?? "unknown",
    color: cc.color ?? "#60a5fa",
  }));

  return (
    <CalendarClient
      appointmentsByDay={appointmentsByDay}
      stats={stats}
      monthLabel={monthLabel}
      today={now.getDate()}
      daysInMonth={new Date(year, month, 0).getDate()}
      firstDayOfWeek={new Date(year, month - 1, 1).getDay()}
      initialAppointmentId={params.id ?? null}
      calendarSources={calendarSources}
    />
  );
}
