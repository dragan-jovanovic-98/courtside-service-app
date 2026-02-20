import { getAppointmentsByMonth, getCalendarStats } from "@/lib/queries/calendar";
import { CalendarClient } from "./_components/calendar-client";

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  const [appointmentsByDay, stats] = await Promise.all([
    getAppointmentsByMonth(year, month),
    getCalendarStats(year, month),
  ]);

  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <CalendarClient
      appointmentsByDay={appointmentsByDay}
      stats={stats}
      monthLabel={monthLabel}
      today={now.getDate()}
      daysInMonth={new Date(year, month, 0).getDate()}
      firstDayOfWeek={new Date(year, month - 1, 1).getDay()}
    />
  );
}
