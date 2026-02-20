"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Phone,
  Megaphone,
  Calendar,
  XCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import type { CalendarAppointmentData } from "@/types";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Simple color mapping for campaigns
function campaignColor(campaign: string): string {
  const hash = campaign
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ["#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#f87171"];
  return colors[hash % colors.length];
}

export function CalendarClient({
  appointmentsByDay,
  stats,
  monthLabel,
  today,
  daysInMonth,
  firstDayOfWeek,
}: {
  appointmentsByDay: Record<number, CalendarAppointmentData[]>;
  stats: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    showRate: string;
  };
  monthLabel: string;
  today: number;
  daysInMonth: number;
  firstDayOfWeek: number; // 0=Sun, 1=Mon, etc
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<{
    day: number;
    idx: number;
  } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState("");

  const selAppt: CalendarAppointmentData | null = selected
    ? (appointmentsByDay[selected.day] || [])[selected.idx] ?? null
    : null;

  // Build upcoming appointments for the next 7 days
  const upcoming: (CalendarAppointmentData & { day: number })[] = [];
  for (let d = today; d <= Math.min(today + 6, daysInMonth); d++) {
    (appointmentsByDay[d] || []).forEach((a) =>
      upcoming.push({ ...a, day: d })
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-0">
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
            <p className="mt-1 text-[13px] text-text-muted">{monthLabel}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 flex gap-2">
          {(
            [
              [stats.today, "Today"],
              [stats.thisWeek, "This Week"],
              [stats.thisMonth, "This Month"],
              [stats.showRate, "Show Rate"],
            ] as const
          ).map(([val, label]) => (
            <div
              key={label}
              className="flex-1 rounded-xl border border-border-default bg-surface-card px-3.5 py-2.5 text-center"
            >
              <div className="text-xl font-bold tabular-nums text-text-primary">
                {val}
              </div>
              <div className="text-[10px] text-text-dim">{label}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border-default bg-surface-card">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border-default">
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d}
                className="p-2 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month start */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[86px] border-b border-r border-border-light p-1.5"
              />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const appts = appointmentsByDay[day] || [];
              const isPast = day < today;
              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[86px] border-b border-r border-border-light p-1.5",
                    day === today && "bg-[rgba(52,211,153,0.04)]",
                    isPast && "opacity-50"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        day === today
                          ? "font-extrabold text-emerald-light"
                          : "text-text-dim"
                      )}
                    >
                      {day}
                    </span>
                    {appts.length > 0 && (
                      <span className="text-[9px] font-semibold text-text-dim">
                        {appts.length}
                      </span>
                    )}
                  </div>
                  {appts.map((a, j) => {
                    const color = campaignColor(a.campaign);
                    return (
                      <button
                        key={j}
                        onClick={() => {
                          setSelected({ day, idx: j });
                          setPanelOpen(true);
                        }}
                        className="mb-0.5 w-full truncate rounded-r-[3px] border-l-2 py-[3px] pl-[5px] pr-1 text-left text-[9px] transition-all"
                        style={{
                          borderColor: color,
                          background: `${color}15`,
                          color: color,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = `${color}25`)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = `${color}15`)
                        }
                      >
                        {a.time} · {a.name.split(" ").pop() || a.name}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming This Week */}
        <SectionLabel>Upcoming This Week</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
          {upcoming.length > 0 ? (
            upcoming.map((a, i) => {
              const dayLabel =
                a.day === today
                  ? "Today"
                  : a.day === today + 1
                  ? "Tomorrow"
                  : `Day ${a.day}`;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelected({
                      day: a.day,
                      idx: (appointmentsByDay[a.day] || []).indexOf(a),
                    });
                    setPanelOpen(true);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                    i < upcoming.length - 1 && "border-b border-border-light"
                  )}
                >
                  <div className="w-[60px] shrink-0">
                    <div
                      className={cn(
                        "text-[10px] font-semibold",
                        a.day === today
                          ? "text-emerald-light"
                          : "text-text-dim"
                      )}
                    >
                      {dayLabel}
                    </div>
                    <div className="text-xs font-semibold tabular-nums text-text-primary">
                      {a.time}
                    </div>
                  </div>
                  <div
                    className="h-7 w-[3px] shrink-0 rounded-sm"
                    style={{ background: campaignColor(a.campaign) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text-primary">
                      {a.name}
                    </div>
                    <div className="truncate text-[11px] text-text-dim">
                      {a.company} · {a.campaign}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-text-dim"
                  />
                </button>
              );
            })
          ) : (
            <div className="px-5 py-5 text-center text-[13px] text-text-dim">
              No upcoming appointments
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {panelOpen && selAppt && (
        <div className="w-full shrink-0 rounded-xl border border-border-default bg-surface-card p-5 lg:sticky lg:top-5 lg:ml-4 lg:w-[300px] lg:self-start">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-dim">
              Appointment Details
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              className="flex text-text-dim hover:text-text-muted"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[17px] font-bold text-text-primary">
              {selAppt.name}
            </div>
            <div className="text-xs text-text-dim">{selAppt.company}</div>
          </div>

          <div className="mb-4 flex gap-2">
            <div
              className="flex-1 rounded-lg p-2 text-center"
              style={{
                background: `${campaignColor(selAppt.campaign)}10`,
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: campaignColor(selAppt.campaign) }}
              >
                {selAppt.time}
              </div>
              <div className="text-[9px] text-text-dim">
                {selected && `Day ${selected.day}`}
              </div>
            </div>
            <div className="flex-1 rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-center">
              <div className="text-xs font-semibold text-text-primary">
                {selAppt.duration}
              </div>
              <div className="text-[9px] text-text-dim">Duration</div>
            </div>
          </div>

          <div className="mb-4">
            {(
              [
                [<Phone size={12} key="p" />, selAppt.phone],
                [<Megaphone size={12} key="c" />, selAppt.campaign],
              ] as const
            ).map(([icon, val], i) => (
              <div
                key={i}
                className="mb-1.5 flex items-center gap-2 text-xs text-text-muted"
              >
                {icon} {val}
              </div>
            ))}
          </div>

          {selAppt.summary && (
            <div className="mb-4">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim">
                AI Call Summary
              </div>
              <p className="text-xs leading-relaxed text-text-muted">
                {selAppt.summary}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Button
              className="justify-center gap-1.5 text-xs opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon — will allow you to call the contact directly from your phone"
            >
              <Phone size={12} /> Call Now
            </Button>

            {rescheduleMode ? (
              <div className="flex flex-col gap-1.5">
                <input
                  type="datetime-local"
                  value={rescheduleValue}
                  onChange={(e) => setRescheduleValue(e.target.value)}
                  className="rounded-lg border border-border-default bg-surface-input px-2.5 py-2 text-xs text-text-primary [color-scheme:dark]"
                />
                <div className="flex gap-1.5">
                  <Button
                    className="flex-1 justify-center bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                    disabled={actionBusy || !rescheduleValue}
                    onClick={async () => {
                      setActionBusy(true);
                      const { error } = await callEdgeFunction("reschedule-appointment", {
                        appointment_id: selAppt.id,
                        scheduled_at: new Date(rescheduleValue).toISOString(),
                      }, "PATCH");
                      setActionBusy(false);
                      if (error) alert(`Reschedule failed: ${error}`);
                      else {
                        setRescheduleMode(false);
                        setPanelOpen(false);
                        router.refresh();
                      }
                    }}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-center text-xs"
                    onClick={() => setRescheduleMode(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="justify-center gap-1.5 text-xs"
                disabled={actionBusy}
                onClick={() => {
                  setRescheduleValue(selAppt.scheduledAt.slice(0, 16));
                  setRescheduleMode(true);
                }}
              >
                <Calendar size={12} /> Reschedule
              </Button>
            )}

            <Button
              variant="ghost"
              className="justify-center gap-1.5 text-xs text-red-light"
              disabled={actionBusy}
              onClick={async () => {
                if (!window.confirm("Cancel this appointment?")) return;
                setActionBusy(true);
                const { error } = await callEdgeFunction("cancel-appointment", {
                  appointment_id: selAppt.id,
                }, "PATCH");
                setActionBusy(false);
                if (error) alert(`Cancel failed: ${error}`);
                else {
                  setPanelOpen(false);
                  router.refresh();
                }
              }}
            >
              <XCircle size={12} /> Cancel Appointment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
