"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import { fetchCampaignSchedules } from "@/lib/actions/campaigns";
import type { CampaignWithAgent } from "@/types";

type AgentOption = { id: string; name: string };
type CalendarOption = { id: string; label: string };
type ScheduleDay = { day: string; on: boolean; slots: string[][] };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hr = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    const mm = m === 0 ? "00" : "30";
    TIME_OPTIONS.push(`${hr}:${mm} ${ampm}`);
  }
}
TIME_OPTIONS.push("11:59 PM");

const TIMEZONE_OPTIONS = [
  { value: "America/Toronto", label: "EST — Eastern" },
  { value: "America/Chicago", label: "CST — Central" },
  { value: "America/Denver", label: "MST — Mountain" },
  { value: "America/Los_Angeles", label: "PST — Pacific" },
];

function dbSchedulesToLocal(
  dbRows: { day_of_week: number; enabled: boolean; slots: { start: string; end: string }[] }[]
): ScheduleDay[] {
  return DAY_NAMES.map((day, i) => {
    const row = dbRows.find((r) => r.day_of_week === i);
    if (!row) return { day, on: false, slots: [] };
    return {
      day,
      on: row.enabled,
      slots: row.slots.map((s) => [s.start, s.end]),
    };
  });
}

function localToPayload(schedule: ScheduleDay[]) {
  return schedule.map((d) => ({
    day_of_week: DAY_NAMES.indexOf(d.day),
    enabled: d.on,
    slots: d.on ? d.slots.map(([start, end]) => ({ start, end })) : [],
  }));
}

/* ── Slot Popover ─────────────────────────────────────────────── */

function SlotPopover({
  initial,
  onSave,
  onClose,
}: {
  initial?: [string, string];
  onSave: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(initial?.[0] ?? "9:00 AM");
  const [end, setEnd] = useState(initial?.[1] ?? "5:00 PM");

  return (
    <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-border-default bg-[#1a1f2b] p-3 shadow-xl">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {initial ? "Edit Time Window" : "Add Time Window"}
      </div>
      <div className="flex items-center gap-2">
        <div>
          <div className="mb-1 text-[10px] text-text-dim">Start</div>
          <Combobox
            options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
            value={start}
            onValueChange={setStart}
            placeholder="Start..."
            searchPlaceholder="Search time..."
            size="sm"
            className="w-[110px]"
          />
        </div>
        <span className="mt-4 text-text-dim">→</span>
        <div>
          <div className="mb-1 text-[10px] text-text-dim">End</div>
          <Combobox
            options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
            value={end}
            onValueChange={setEnd}
            placeholder="End..."
            searchPlaceholder="Search time..."
            size="sm"
            className="w-[110px]"
          />
        </div>
        <button
          onClick={() => onSave(start, end)}
          className="mt-4 rounded-md bg-emerald-dark px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-dark/90"
        >
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );
}

/* ── Schedule Section ─────────────────────────────────────────── */

function ScheduleSection({
  label,
  schedule,
  onChange,
  readOnly,
}: {
  label: string;
  schedule: ScheduleDay[];
  onChange: (s: ScheduleDay[]) => void;
  readOnly: boolean;
}) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const toggleDay = (idx: number) => {
    if (readOnly) return;
    onChange(
      schedule.map((d, i) =>
        i === idx ? { ...d, on: !d.on, slots: d.on ? [] : [["9:00 AM", "5:00 PM"]] } : d
      )
    );
  };

  const removeSlot = (dayIdx: number, slotIdx: number) => {
    if (readOnly) return;
    onChange(
      schedule.map((d, i) =>
        i === dayIdx ? { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) } : d
      )
    );
  };

  const saveSlot = (dayIdx: number, slotIdx: number | null, start: string, end: string) => {
    onChange(
      schedule.map((d, i) => {
        if (i !== dayIdx) return d;
        if (slotIdx !== null) {
          return { ...d, slots: d.slots.map((s, si) => (si === slotIdx ? [start, end] : s)) };
        }
        return { ...d, slots: [...d.slots, [start, end]] };
      })
    );
    setOpenPopover(null);
  };

  return (
    <div className="rounded-xl border border-border-default bg-[rgba(255,255,255,0.02)] p-4">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-col gap-1">
        {schedule.map((day, dayIdx) => (
          <div key={day.day} className="flex items-center gap-2.5 border-b border-border-light py-1.5">
            <div
              onClick={() => toggleDay(dayIdx)}
              className={cn(
                "relative h-[18px] w-[34px] shrink-0 rounded-full",
                readOnly ? "opacity-60" : "cursor-pointer",
                day.on ? "bg-emerald-dark" : "bg-[rgba(255,255,255,0.08)]"
              )}
            >
              <div
                className="absolute top-0.5 size-3.5 rounded-full bg-white transition-[left]"
                style={{ left: day.on ? 18 : 2 }}
              />
            </div>
            <span className={cn("w-20 shrink-0 text-xs font-semibold", day.on ? "text-text-primary" : "text-text-dim")}>
              {day.day}
            </span>
            {day.on ? (
              <div className="relative flex flex-1 flex-wrap items-center gap-1.5">
                {day.slots.map((s, si) => (
                  <div
                    key={si}
                    className="flex items-center gap-1 rounded-md border border-border-light bg-surface-input px-2 py-[3px]"
                  >
                    {readOnly ? (
                      <span className="text-[11px] tabular-nums text-text-primary">
                        {s[0]} <span className="text-[10px] text-text-dim">→</span> {s[1]}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setOpenPopover(`${label}-${dayIdx}-${si}`)}
                          className="flex items-center gap-1 text-[11px] tabular-nums text-text-primary hover:text-emerald-light"
                        >
                          {s[0]} <span className="text-[10px] text-text-dim">→</span> {s[1]}
                        </button>
                        <button
                          onClick={() => removeSlot(dayIdx, si)}
                          className="ml-0.5 flex text-text-dim hover:text-red-light"
                        >
                          <X size={10} />
                        </button>
                        {openPopover === `${label}-${dayIdx}-${si}` && (
                          <SlotPopover
                            initial={[s[0], s[1]]}
                            onSave={(start, end) => saveSlot(dayIdx, si, start, end)}
                            onClose={() => setOpenPopover(null)}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenPopover(`${label}-${dayIdx}`)}
                      className="flex items-center gap-0.5 rounded-md border border-dashed border-border-default px-2 py-[3px] text-[10px] text-text-dim hover:text-text-muted"
                    >
                      <Plus size={9} /> Add slot
                    </button>
                    {openPopover === `${label}-${dayIdx}` && (
                      <SlotPopover
                        onSave={(start, end) => saveSlot(dayIdx, null, start, end)}
                        onClose={() => setOpenPopover(null)}
                      />
                    )}
                  </div>
                )}
                {day.slots.length === 0 && (
                  <span className="text-[11px] text-text-dim">No time windows</span>
                )}
              </div>
            ) : (
              <span className="text-[11px] italic text-text-faint">Off</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Modal ───────────────────────────────────────────────── */

export function CampaignEditModal({
  campaign,
  agents,
  calendarOptions,
  open,
  onOpenChange,
}: {
  campaign: CampaignWithAgent;
  agents: AgentOption[];
  calendarOptions: CalendarOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const readOnly = campaign.status !== "draft" && campaign.status !== "paused";

  // Form state
  const [name, setName] = useState(campaign.name);
  const [agentId, setAgentId] = useState(campaign.agent_id ?? "");
  const [dailyLimit, setDailyLimit] = useState(campaign.daily_call_limit ?? 100);
  const [maxRetries, setMaxRetries] = useState(campaign.max_retries ?? 3);
  const [timezone, setTimezone] = useState(campaign.timezone ?? "America/Toronto");
  const [endDate, setEndDate] = useState(campaign.end_date ?? "");
  const [calendarConnectionId, setCalendarConnectionId] = useState(
    campaign.calendar_connection_id ?? "default"
  );
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [apptSchedule, setApptSchedule] = useState<ScheduleDay[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schedules on open
  useEffect(() => {
    if (!open) return;
    setLoadingSchedules(true);
    fetchCampaignSchedules(campaign.id).then((data) => {
      setSchedule(dbSchedulesToLocal(data.schedules));
      setApptSchedule(dbSchedulesToLocal(data.appointmentSchedules));
      setLoadingSchedules(false);
    });
  }, [open, campaign.id]);

  // Reset form when campaign changes
  useEffect(() => {
    setName(campaign.name);
    setAgentId(campaign.agent_id ?? "");
    setDailyLimit(campaign.daily_call_limit ?? 100);
    setMaxRetries(campaign.max_retries ?? 3);
    setTimezone(campaign.timezone ?? "America/Toronto");
    setEndDate(campaign.end_date ?? "");
    setCalendarConnectionId(campaign.calendar_connection_id ?? "default");
    setError(null);
  }, [campaign]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: err } = await callEdgeFunction("update-campaign", {
      campaign_id: campaign.id,
      name: name.trim(),
      agent_id: agentId || undefined,
      daily_call_limit: dailyLimit,
      max_retries: maxRetries,
      timezone,
      end_date: endDate || null,
      calendar_connection_id: calendarConnectionId === "default" ? null : calendarConnectionId,
      schedules: localToPayload(schedule),
      appointment_schedules: localToPayload(apptSchedule),
    });

    setSaving(false);
    if (err) {
      setError(err);
    } else {
      onOpenChange(false);
      router.refresh();
    }
  };

  const statusColor = campaign.status === "active"
    ? "emerald"
    : campaign.status === "paused"
    ? "amber"
    : campaign.status === "completed"
    ? "blue"
    : "default";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title=""
      className="max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      {/* Custom header with status badge */}
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-lg font-bold text-text-primary">{campaign.name}</h2>
        <ColoredBadge color={statusColor}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </ColoredBadge>
        {readOnly && (
          <span className="ml-auto text-[11px] text-text-dim">Read-only</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-4 py-2.5 text-xs text-red-light">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-dim">Campaign Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
          />
        </div>

        {/* Agent + Calendar row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">Agent</label>
            <Select
              value={agentId}
              onValueChange={setAgentId}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">Calendar Connection</label>
            <Select
              value={calendarConnectionId}
              onValueChange={setCalendarConnectionId}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Courtside Calendar (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Courtside Calendar (default)</SelectItem>
                {calendarOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Limits row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">Daily Call Limit</label>
            <Input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value) || 0)}
              disabled={readOnly}
              className="border-border-default bg-surface-input text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">Max Retries</label>
            <Input
              type="number"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value) || 0)}
              disabled={readOnly}
              className="border-border-default bg-surface-input text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={readOnly}
              className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-text-primary [color-scheme:dark] disabled:opacity-50"
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-dim">Timezone</label>
          <Combobox
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onValueChange={setTimezone}
            placeholder="Select timezone..."
            searchPlaceholder="Search timezones..."
            disabled={readOnly}
          />
        </div>

        {/* Schedules */}
        {loadingSchedules ? (
          <div className="rounded-xl border border-border-default bg-[rgba(255,255,255,0.02)] p-8 text-center text-sm text-text-dim">
            Loading schedules...
          </div>
        ) : (
          <>
            <ScheduleSection
              label="Calling Schedule"
              schedule={schedule}
              onChange={setSchedule}
              readOnly={readOnly}
            />
            <ScheduleSection
              label="Appointment Availability"
              schedule={apptSchedule}
              onChange={setApptSchedule}
              readOnly={readOnly}
            />
          </>
        )}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="mt-6 flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
            onClick={handleSave}
            disabled={saving || loadingSchedules}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
