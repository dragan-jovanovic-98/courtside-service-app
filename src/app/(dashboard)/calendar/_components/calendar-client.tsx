"use client";

import { useState } from "react";
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
import { mockCalendarData, campaignColor, type CalendarAppointment } from "@/lib/mock-data";

const TODAY = 17;
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAMPAIGN_LEGEND = [
  ["Spring Mortgage", "#34d399"],
  ["Insurance", "#60a5fa"],
  ["Commercial", "#fbbf24"],
  ["Q1 Refi", "#a78bfa"],
] as const;

export function CalendarClient() {
  const [selected, setSelected] = useState<{ day: number; idx: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const total = Object.values(mockCalendarData).flat().length;
  const selAppt: CalendarAppointment | null = selected ? (mockCalendarData[selected.day] || [])[selected.idx] ?? null : null;

  // Upcoming this week (days 17-23)
  const upcoming: (CalendarAppointment & { day: number })[] = [];
  for (let d = 17; d <= 23; d++) {
    (mockCalendarData[d] || []).forEach((a) => upcoming.push({ ...a, day: d }));
  }

  return (
    <div className="flex gap-0">
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
            <p className="mt-1 text-[13px] text-text-muted">February 2026</p>
          </div>
          <div className="flex items-center gap-2.5 text-[11px]">
            {CAMPAIGN_LEGEND.map(([label, color]) => (
              <div key={label} className="flex items-center gap-1">
                <div className="size-1.5 rounded-full" style={{ background: color }} />
                <span className="text-text-dim">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 flex gap-2">
          {([
            [4, "Today"],
            [upcoming.length, "This Week"],
            [total, "This Month"],
            ["87%", "Show Rate (Past 30d)"],
          ] as const).map(([val, label]) => (
            <div key={label} className="flex-1 rounded-xl border border-border-default bg-surface-card px-3.5 py-2.5 text-center">
              <div className="text-xl font-bold tabular-nums text-text-primary">{val}</div>
              <div className="text-[10px] text-text-dim">{label}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mb-4 overflow-hidden rounded-xl border border-border-default bg-surface-card">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border-default">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="p-2 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 28 }, (_, i) => {
              const day = i + 1;
              const appts = mockCalendarData[day] || [];
              const isPast = day < TODAY;
              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[86px] border-b border-r border-border-light p-1.5",
                    day === TODAY && "bg-[rgba(52,211,153,0.04)]",
                    isPast && "opacity-50"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("text-[11px] tabular-nums", day === TODAY ? "font-extrabold text-emerald-light" : "text-text-dim")}>
                      {day}
                    </span>
                    {appts.length > 0 && <span className="text-[9px] font-semibold text-text-dim">{appts.length}</span>}
                  </div>
                  {appts.map((a, j) => {
                    const color = campaignColor(a.campaign);
                    return (
                      <button
                        key={j}
                        onClick={() => { setSelected({ day, idx: j }); setPanelOpen(true); }}
                        className="mb-0.5 w-full truncate rounded-r-[3px] border-l-2 py-[3px] pl-[5px] pr-1 text-left text-[9px] transition-all"
                        style={{
                          borderColor: color,
                          background: `${color}15`,
                          color: color,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = `${color}25`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = `${color}15`)}
                      >
                        {a.time} · {a.name.split(" ")[1] || a.name}
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
          {upcoming.length > 0 ? upcoming.map((a, i) => {
            const dayLabel = a.day === 17 ? "Today" : a.day === 18 ? "Tomorrow" : `Feb ${a.day}`;
            return (
              <button
                key={i}
                onClick={() => { setSelected({ day: a.day, idx: (mockCalendarData[a.day] || []).indexOf(a) }); setPanelOpen(true); }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                  i < upcoming.length - 1 && "border-b border-border-light"
                )}
              >
                <div className="w-[60px] shrink-0">
                  <div className={cn("text-[10px] font-semibold", a.day === 17 ? "text-emerald-light" : "text-text-dim")}>{dayLabel}</div>
                  <div className="text-xs font-semibold tabular-nums text-text-primary">{a.time}</div>
                </div>
                <div className="h-7 w-[3px] shrink-0 rounded-sm" style={{ background: campaignColor(a.campaign) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text-primary">{a.name}</div>
                  <div className="truncate text-[11px] text-text-dim">{a.company} · {a.campaign}</div>
                </div>
                <ChevronRight size={14} className="shrink-0 text-text-dim" />
              </button>
            );
          }) : (
            <div className="px-5 py-5 text-center text-[13px] text-text-dim">No upcoming appointments</div>
          )}
        </div>
      </div>

      {/* ── Detail panel ──────────────────────────────────────────── */}
      {panelOpen && selAppt && (
        <div className="sticky top-5 ml-4 w-[300px] shrink-0 self-start rounded-xl border border-border-default bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-dim">Appointment Details</span>
            <button onClick={() => setPanelOpen(false)} className="flex text-text-dim hover:text-text-muted">
              <X size={14} />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[17px] font-bold text-text-primary">{selAppt.name}</div>
            <div className="text-xs text-text-dim">{selAppt.company}</div>
          </div>

          <div className="mb-4 flex gap-2">
            <div className="flex-1 rounded-lg p-2 text-center" style={{ background: `${campaignColor(selAppt.campaign)}10` }}>
              <div className="text-xs font-semibold" style={{ color: campaignColor(selAppt.campaign) }}>{selAppt.time}</div>
              <div className="text-[9px] text-text-dim">Feb {selected!.day}</div>
            </div>
            <div className="flex-1 rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-center">
              <div className="text-xs font-semibold text-text-primary">{selAppt.duration}</div>
              <div className="text-[9px] text-text-dim">AI Call</div>
            </div>
          </div>

          <div className="mb-4">
            {([
              [<Phone size={12} key="p" />, selAppt.phone],
              [<Megaphone size={12} key="c" />, selAppt.campaign],
            ] as const).map(([icon, val], i) => (
              <div key={i} className="mb-1.5 flex items-center gap-2 text-xs text-text-muted">{icon} {val}</div>
            ))}
          </div>

          <div className="mb-4">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim">AI Call Summary</div>
            <p className="text-xs leading-relaxed text-text-muted">{selAppt.summary}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Button className="justify-center gap-1.5 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90">
              <Phone size={12} /> Call Now
            </Button>
            <Button variant="ghost" className="justify-center gap-1.5 text-xs">
              <Calendar size={12} /> Reschedule
            </Button>
            <Button variant="ghost" className="justify-center gap-1.5 text-xs text-red-light">
              <XCircle size={12} /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
