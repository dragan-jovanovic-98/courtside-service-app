"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Plus, X, Upload, Users, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import { addLeadsFromContacts } from "@/lib/actions/leads";
import type { ContactForSelection } from "@/types";
import type { BadgeColor } from "@/lib/design-tokens";

type AgentOption = { id: string; name: string; tag: string; description: string };
type CalendarOption = { id: string; label: string };
type CampaignRef = { id: string; name: string };
type ScheduleDay = { day: string; on: boolean; slots: string[][] };

type FilterBubble = {
  type: "status" | "campaign";
  value: string;
  label: string;
};

const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "appt_set", label: "Appt Set" },
  { value: "showed", label: "Showed" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
  { value: "bad_lead", label: "Bad Lead" },
];

const STATUS_COLORS: Record<string, BadgeColor> = {
  new: "blue",
  contacted: "purple",
  interested: "amber",
  appt_set: "emerald",
  showed: "emerald",
  closed_won: "emerald",
  closed_lost: "red",
  bad_lead: "red",
};

const STEPS = ["Select Agent", "Add Leads", "Schedule", "Review"];

// Generate time options in 30-min increments (6:00 AM → 11:30 PM)
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  for (const m of [0, 30]) {
    if (h === 23 && m === 30) continue;
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    const min = m === 0 ? "00" : "30";
    TIME_OPTIONS.push(`${hour12}:${min} ${ampm}`);
  }
}
TIME_OPTIONS.push("11:59 PM");

const makeDefaultSchedule = (): ScheduleDay[] => [
  { day: "Monday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Tuesday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Wednesday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Thursday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Friday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Saturday", on: false, slots: [] },
  { day: "Sunday", on: false, slots: [] },
];

const makeDefaultApptSchedule = (): ScheduleDay[] => [
  { day: "Monday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Tuesday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Wednesday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Thursday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Friday", on: true, slots: [["9:00 AM", "5:00 PM"]] },
  { day: "Saturday", on: false, slots: [] },
  { day: "Sunday", on: false, slots: [] },
];

/* ─── Slot Popover (used by both schedule sections) ───────────────── */

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
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-border-default bg-[#1a1f2b] p-3 shadow-xl"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {initial ? "Edit Time Window" : "Add Time Window"}
      </div>
      <div className="flex items-center gap-2">
        <div>
          <div className="mb-1 text-[10px] text-text-dim">Start</div>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-border-default bg-surface-input px-2 py-1.5 text-xs text-text-primary outline-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <span className="mt-4 text-text-dim">→</span>
        <div>
          <div className="mb-1 text-[10px] text-text-dim">End</div>
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-border-default bg-surface-input px-2 py-1.5 text-xs text-text-primary outline-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
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

export function CampaignWizard({
  agents,
  calendarOptions = [],
  hasCrm = false,
  contacts = [],
  existingCampaigns = [],
}: {
  agents: AgentOption[];
  calendarOptions?: CalendarOption[];
  hasCrm?: boolean;
  contacts?: ContactForSelection[];
  existingCampaigns?: CampaignRef[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

  // Step 2: CSV
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRowCount, setCsvRowCount] = useState(0);
  const [crmImportCount, setCrmImportCount] = useState(0);
  const [crmImporting, setCrmImporting] = useState(false);

  // Step 2: Existing contacts
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showExistingModal, setShowExistingModal] = useState(false);

  // Step 3: Schedule & rules
  const [schedule, setSchedule] = useState<ScheduleDay[]>(makeDefaultSchedule);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [maxRetries, setMaxRetries] = useState(2);
  const [timezone, setTimezone] = useState("America/Toronto");
  const [endDate, setEndDate] = useState("");

  // Step 3: Appointment calendar + availability
  const [calendarConnectionId, setCalendarConnectionId] = useState<string>("");
  const [apptSchedule, setApptSchedule] = useState<ScheduleDay[]>(makeDefaultApptSchedule);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setCsvFileName(file.name);
      const lines = text.trim().split("\n");
      setCsvRowCount(Math.max(0, lines.length - 1)); // subtract header
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const toggleDay = (dayIdx: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, on: !d.on, slots: d.on ? [] : [["9:00 AM", "5:00 PM"]] } : d
      )
    );
  };

  const removeSlot = (dayIdx: number, slotIdx: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) } : d
      )
    );
  };

  const saveSlot = (dayIdx: number, slotIdx: number | null, start: string, end: string) => {
    setSchedule((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        if (slotIdx !== null) {
          return { ...d, slots: d.slots.map((s, si) => (si === slotIdx ? [start, end] : s)) };
        }
        return { ...d, slots: [...d.slots, [start, end]] };
      })
    );
  };

  const toggleApptDay = (dayIdx: number) => {
    setApptSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, on: !d.on, slots: d.on ? [] : [["9:00 AM", "5:00 PM"]] } : d
      )
    );
  };

  const removeApptSlot = (dayIdx: number, slotIdx: number) => {
    setApptSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) } : d
      )
    );
  };

  const saveApptSlot = (dayIdx: number, slotIdx: number | null, start: string, end: string) => {
    setApptSchedule((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        if (slotIdx !== null) {
          return { ...d, slots: d.slots.map((s, si) => (si === slotIdx ? [start, end] : s)) };
        }
        return { ...d, slots: [...d.slots, [start, end]] };
      })
    );
  };

  // Track which popover is open: "calling-{dayIdx}" or "calling-{dayIdx}-{slotIdx}" (edit)
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const activeDays = schedule.filter((d) => d.on).map((d) => d.day.slice(0, 3)).join(", ");
  const apptActiveDays = apptSchedule.filter((d) => d.on).map((d) => d.day.slice(0, 3)).join(", ");

  const handleSubmit = async (activate: boolean) => {
    if (!agentId || !campaignName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create campaign as draft
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const schedulesPayload = schedule.map((d) => ({
        day_of_week: dayNames.indexOf(d.day),
        enabled: d.on,
        slots: d.on
          ? d.slots.map(([start, end]) => ({ start, end }))
          : [],
      }));

      const apptSchedulesPayload = apptSchedule.map((d) => ({
        day_of_week: dayNames.indexOf(d.day),
        enabled: d.on,
        slots: d.on
          ? d.slots.map(([start, end]) => ({ start, end }))
          : [],
      }));

      const { data: campaign, error: createErr } = await callEdgeFunction<{ id: string }>(
        "create-campaign",
        {
          name: campaignName.trim(),
          agent_id: agentId,
          daily_call_limit: dailyLimit,
          max_retries: maxRetries,
          timezone,
          end_date: endDate || null,
          schedules: schedulesPayload,
          calendar_connection_id: calendarConnectionId || null,
          appointment_schedules: apptSchedulesPayload,
        }
      );

      if (createErr || !campaign) {
        setError(createErr ?? "Failed to create campaign");
        setSubmitting(false);
        return;
      }

      // 2. Import leads if CSV exists
      if (csvText) {
        const { error: importErr } = await callEdgeFunction("import-leads", {
          campaign_id: campaign.id,
          csv: csvText,
        });
        if (importErr) {
          setError(`Campaign created but lead import failed: ${importErr}`);
          setSubmitting(false);
          return;
        }
      }

      // 2b. Add existing contacts as leads
      if (selectedContactIds.size > 0) {
        const result = await addLeadsFromContacts(
          Array.from(selectedContactIds),
          campaign.id
        );
        if (result.error) {
          setError(`Campaign created but adding existing contacts failed: ${result.error}`);
          setSubmitting(false);
          return;
        }
      }

      // 3. Activate if requested
      if (activate) {
        const { error: activateErr } = await callEdgeFunction("update-campaign-status", {
          campaign_id: campaign.id,
          status: "active",
        });
        if (activateErr) {
          setError(`Campaign created but activation failed: ${activateErr}`);
          setSubmitting(false);
          return;
        }
      }

      router.push("/campaigns");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[600px]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2.5">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : router.push("/campaigns"))}
          className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1.5 text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-[22px] font-bold text-text-primary">New Campaign</h1>
      </div>

      {/* Stepper */}
      <div className="mb-7 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-[5px] text-xs font-semibold",
                step > i + 1
                  ? "bg-emerald-bg text-emerald-light"
                  : step === i + 1
                  ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                  : "bg-[rgba(255,255,255,0.03)] text-text-dim"
              )}
            >
              {step > i + 1 ? <Check size={12} /> : <span>{i + 1}</span>}
              <span>{s}</span>
            </div>
            {i < 3 && <div className="h-px w-4 bg-border-default" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-4 py-2.5 text-xs text-red-light">
          {error}
        </div>
      )}

      {/* Step 1: Select Agent */}
      {step === 1 && (
        <div>
          <p className="mb-4 text-[13px] text-text-muted">Choose the AI agent for this campaign.</p>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => setAgentId(a.id)}
              className={cn(
                "mb-2 w-full rounded-xl border p-4 text-left transition-all",
                agentId === a.id
                  ? "border-[rgba(52,211,153,0.4)] bg-emerald-bg"
                  : "border-border-default bg-surface-card hover:bg-surface-card-hover"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{a.name}</span>
                <ColoredBadge color={agentId === a.id ? "emerald" : "default"}>{a.tag}</ColoredBadge>
              </div>
              <p className="mt-1 text-xs text-text-dim">{a.description}</p>
            </button>
          ))}
          <Button
            onClick={() => setStep(2)}
            disabled={!agentId}
            className="mt-3 w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Name + Leads */}
      {step === 2 && (
        <div>
          <p className="mb-4 text-[13px] text-text-muted">Name your campaign and add leads.</p>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name..."
            className="mb-3 border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
          />
          <div className="mb-3 grid grid-cols-3 gap-2.5">
            {/* CSV Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-text-dim",
                csvFileName
                  ? "border-[rgba(52,211,153,0.4)] bg-emerald-bg"
                  : "border-border-default"
              )}
            >
              <Upload size={16} className="mx-auto mb-1.5 text-text-dim" />
              <div className="text-[13px] font-semibold text-text-muted">
                {csvFileName ?? "Upload CSV"}
              </div>
              <div className="mt-1 text-[11px] text-text-dim">
                {csvFileName ? `${csvRowCount} leads` : "Drag & drop or browse"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
            {/* Import from CRM */}
            <button
              onClick={async () => {
                if (!hasCrm) return;
                setCrmImporting(true);
                try {
                  const { data, error: err } = await callEdgeFunction<{ imported: number }>(
                    "crm-import-contacts",
                    { preview_only: false }
                  );
                  if (err) {
                    setError(`CRM import failed: ${err}`);
                  } else {
                    setCrmImportCount(data?.imported ?? 0);
                  }
                } catch {
                  setError("CRM import failed");
                }
                setCrmImporting(false);
              }}
              disabled={!hasCrm || crmImporting}
              title={hasCrm ? "Import contacts from CRM" : "Connect a CRM in Settings → Integrations"}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                !hasCrm
                  ? "cursor-not-allowed border-border-default opacity-50"
                  : crmImportCount > 0
                    ? "border-[rgba(96,165,250,0.4)] bg-blue-bg"
                    : "border-border-default hover:border-text-dim"
              )}
            >
              <Users size={16} className="mx-auto mb-1.5 text-text-dim" />
              <div className="text-[13px] font-semibold text-text-muted">
                {crmImporting ? "Importing..." : crmImportCount > 0 ? "CRM Imported" : "Import from CRM"}
              </div>
              <div className="mt-1 text-[11px] text-text-dim">
                {!hasCrm ? "Not connected" : crmImportCount > 0 ? `${crmImportCount} contacts` : "HubSpot contacts"}
              </div>
            </button>
            {/* Existing Contacts */}
            <button
              onClick={() => setShowExistingModal(true)}
              disabled={contacts.length === 0}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                contacts.length === 0
                  ? "cursor-not-allowed border-border-default opacity-50"
                  : selectedContactIds.size > 0
                    ? "border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)]"
                    : "border-border-default hover:border-text-dim"
              )}
            >
              <Users size={16} className="mx-auto mb-1.5 text-text-dim" />
              <div className="text-[13px] font-semibold text-text-muted">
                {selectedContactIds.size > 0 ? "Existing Contacts" : "Existing Contacts"}
              </div>
              <div className="mt-1 text-[11px] text-text-dim">
                {contacts.length === 0
                  ? "No contacts yet"
                  : selectedContactIds.size > 0
                    ? `${selectedContactIds.size} selected`
                    : `${contacts.length} available`}
              </div>
            </button>
          </div>
          {csvFileName && (
            <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-text-dim">
                  {csvFileName} · {csvRowCount} leads
                </div>
                <button
                  onClick={() => {
                    setCsvText(null);
                    setCsvFileName(null);
                    setCsvRowCount(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-text-dim hover:text-text-muted"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          <Button
            onClick={() => setStep(3)}
            disabled={!campaignName.trim()}
            className="mt-3 w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div>
          <p className="mb-4 text-[13px] text-text-muted">Set calling schedule, rules, and optional end date.</p>

          {/* Schedule */}
          <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-4">
            <SectionLabel>Calling Schedule</SectionLabel>
            <div className="flex flex-col gap-1">
              {schedule.map((day, dayIdx) => (
                <div key={day.day} className="flex items-center gap-2.5 border-b border-border-light py-1.5">
                  {/* Toggle */}
                  <div
                    onClick={() => toggleDay(dayIdx)}
                    className={cn(
                      "relative h-[18px] w-[34px] shrink-0 cursor-pointer rounded-full",
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
                          <button
                            onClick={() => setOpenPopover(`calling-${dayIdx}-${si}`)}
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
                          {openPopover === `calling-${dayIdx}-${si}` && (
                            <SlotPopover
                              initial={[s[0], s[1]]}
                              onSave={(start, end) => {
                                saveSlot(dayIdx, si, start, end);
                                setOpenPopover(null);
                              }}
                              onClose={() => setOpenPopover(null)}
                            />
                          )}
                        </div>
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => setOpenPopover(`calling-${dayIdx}`)}
                          className="flex items-center gap-0.5 rounded-md border border-dashed border-border-default px-2 py-[3px] text-[10px] text-text-dim hover:text-text-muted"
                        >
                          <Plus size={9} /> Add slot
                        </button>
                        {openPopover === `calling-${dayIdx}` && (
                          <SlotPopover
                            onSave={(start, end) => {
                              saveSlot(dayIdx, null, start, end);
                              setOpenPopover(null);
                            }}
                            onClose={() => setOpenPopover(null)}
                          />
                        )}
                      </div>
                      {day.slots.length === 0 && (
                        <span className="text-[11px] text-text-dim">No time windows — add one or toggle off</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] italic text-text-faint">Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Appointment Calendar */}
          <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-4">
            <SectionLabel>Appointment Calendar</SectionLabel>
            <p className="mb-2 text-[11px] text-text-dim">
              Select which calendar to check for availability and book appointments to.
            </p>
            <select
              value={calendarConnectionId}
              onChange={(e) => setCalendarConnectionId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary outline-none"
            >
              <option value="">Courtside Calendar (default)</option>
              {calendarOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Availability */}
          <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-4">
            <SectionLabel>Appointment Availability</SectionLabel>
            <p className="mb-2 text-[11px] text-text-dim">
              Set the hours when the AI can offer appointment slots to leads.
            </p>
            <div className="flex flex-col gap-1">
              {apptSchedule.map((day, dayIdx) => (
                <div key={day.day} className="flex items-center gap-2.5 border-b border-border-light py-1.5">
                  <div
                    onClick={() => toggleApptDay(dayIdx)}
                    className={cn(
                      "relative h-[18px] w-[34px] shrink-0 cursor-pointer rounded-full",
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
                          <button
                            onClick={() => setOpenPopover(`appt-${dayIdx}-${si}`)}
                            className="flex items-center gap-1 text-[11px] tabular-nums text-text-primary hover:text-emerald-light"
                          >
                            {s[0]} <span className="text-[10px] text-text-dim">→</span> {s[1]}
                          </button>
                          <button
                            onClick={() => removeApptSlot(dayIdx, si)}
                            className="ml-0.5 flex text-text-dim hover:text-red-light"
                          >
                            <X size={10} />
                          </button>
                          {openPopover === `appt-${dayIdx}-${si}` && (
                            <SlotPopover
                              initial={[s[0], s[1]]}
                              onSave={(start, end) => {
                                saveApptSlot(dayIdx, si, start, end);
                                setOpenPopover(null);
                              }}
                              onClose={() => setOpenPopover(null)}
                            />
                          )}
                        </div>
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => setOpenPopover(`appt-${dayIdx}`)}
                          className="flex items-center gap-0.5 rounded-md border border-dashed border-border-default px-2 py-[3px] text-[10px] text-text-dim hover:text-text-muted"
                        >
                          <Plus size={9} /> Add slot
                        </button>
                        {openPopover === `appt-${dayIdx}` && (
                          <SlotPopover
                            onSave={(start, end) => {
                              saveApptSlot(dayIdx, null, start, end);
                              setOpenPopover(null);
                            }}
                            onClose={() => setOpenPopover(null)}
                          />
                        )}
                      </div>
                      {day.slots.length === 0 && (
                        <span className="text-[11px] text-text-dim">No time windows — add one or toggle off</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] italic text-text-faint">Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="mb-2.5 grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-border-default bg-surface-card p-3">
              <div className="text-[11px] text-text-dim">Daily Limit</div>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value) || 0)}
                className="mt-0.5 w-full bg-transparent text-lg font-bold text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <div className="text-[9px] text-text-faint">calls/day</div>
            </div>
            <div className="rounded-xl border border-border-default bg-surface-card p-3">
              <div className="text-[11px] text-text-dim">Retries</div>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value) || 0)}
                className="mt-0.5 w-full bg-transparent text-lg font-bold text-text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <div className="text-[9px] text-text-faint">per lead</div>
            </div>
            <div className="rounded-xl border border-border-default bg-surface-card p-3">
              <div className="text-[11px] text-text-dim">Timezone</div>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-0.5 w-full appearance-none bg-transparent text-[13px] font-bold text-text-primary outline-none"
              >
                <option value="America/Toronto">EST</option>
                <option value="America/Chicago">CST</option>
                <option value="America/Denver">MST</option>
                <option value="America/Los_Angeles">PST</option>
              </select>
              <div className="text-[9px] text-text-faint">
                {timezone.split("/")[1]?.replace("_", " ")}
              </div>
            </div>
            <div className="rounded-xl border border-border-default bg-surface-card p-3">
              <div className="text-[11px] text-text-dim">End Date</div>
              <div className="text-[13px] font-semibold text-text-primary">
                {endDate || "Optional"}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border-default bg-surface-input px-1.5 py-1 text-[11px] text-text-primary [color-scheme:dark]"
              />
            </div>
          </div>

          <Button
            onClick={() => setStep(4)}
            className="w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div>
          <p className="mb-4 text-[13px] text-text-muted">Review and launch.</p>
          <div className="mb-4 rounded-xl border border-border-default bg-surface-card p-5">
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Campaign", campaignName || "—"],
                ["Agent", agents.find((a) => a.id === agentId)?.name || "—"],
                ["Leads", [csvRowCount > 0 ? `${csvRowCount} CSV` : "", crmImportCount > 0 ? `${crmImportCount} CRM` : "", selectedContactIds.size > 0 ? `${selectedContactIds.size} existing` : ""].filter(Boolean).join(" + ") || "None"],
                ["Schedule", activeDays || "None"],
                ["Limit", `${dailyLimit}/day`],
                ["Retries", `${maxRetries} per lead`],
                ["Timezone", timezone.split("/")[1]?.replace("_", " ") ?? timezone],
                ["End Date", endDate || "None"],
                ["Appt Calendar", calendarConnectionId ? calendarOptions.find((c) => c.id === calendarConnectionId)?.label ?? "External" : "Courtside"],
                ["Appt Hours", apptActiveDays || "None"],
              ] as const).map(([label, val]) => (
                <div key={label}>
                  <span className="block text-[11px] text-text-dim">{label}</span>
                  <span className="text-[13px] font-semibold text-text-primary">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              className="flex-1 justify-center"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
            >
              {submitting ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              className="flex-1 justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
            >
              {submitting ? "Activating..." : "Save & Activate"}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Contacts Modal */}
      {showExistingModal && (
        <ExistingContactsModal
          contacts={contacts}
          existingCampaigns={existingCampaigns}
          selectedIds={selectedContactIds}
          onConfirm={(ids) => {
            setSelectedContactIds(ids);
            setShowExistingModal(false);
          }}
          onClose={() => setShowExistingModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Existing Contacts Modal ─────────────────────────────────────── */

function ExistingContactsModal({
  contacts,
  existingCampaigns,
  selectedIds,
  onConfirm,
  onClose,
}: {
  contacts: ContactForSelection[];
  existingCampaigns: CampaignRef[];
  selectedIds: Set<string>;
  onConfirm: (ids: Set<string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterBubble[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build campaign name map
  const campaignMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of existingCampaigns) map.set(c.id, c.name);
    return map;
  }, [existingCampaigns]);

  // Eligible contacts: exclude DNC (already handled by query, but just in case)
  const eligibleContacts = useMemo(
    () => contacts.filter((c) => !c.is_dnc),
    [contacts]
  );

  // Smart search suggestions
  const suggestions = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    if (!q) return [];

    const results: FilterBubble[] = [];

    // Status suggestions
    for (const s of LEAD_STATUSES) {
      if (
        s.label.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q)
      ) {
        // Don't suggest if already active
        if (!filters.some((f) => f.type === "status" && f.value === s.value)) {
          results.push({ type: "status", value: s.value, label: s.label });
        }
      }
    }

    // Campaign suggestions
    for (const c of existingCampaigns) {
      if (c.name.toLowerCase().includes(q)) {
        if (!filters.some((f) => f.type === "campaign" && f.value === c.id)) {
          results.push({ type: "campaign", value: c.id, label: c.name });
        }
      }
    }

    return results.slice(0, 5);
  }, [searchText, filters, existingCampaigns]);

  // Apply filters + text search
  const filteredContacts = useMemo(() => {
    let result = eligibleContacts;

    // Apply filter bubbles
    for (const f of filters) {
      if (f.type === "status") {
        result = result.filter((c) =>
          c.leads.some((l) => l.status === f.value)
        );
      } else if (f.type === "campaign") {
        result = result.filter((c) =>
          c.leads.some((l) => l.campaign_id === f.value)
        );
      }
    }

    // Apply text search (name, phone, company)
    const q = searchText.toLowerCase().trim();
    if (q && suggestions.length === 0) {
      // Only apply as text search if no filter suggestions match
      result = result.filter((c) => {
        const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
        const phone = c.phone.toLowerCase();
        const company = (c.company ?? "").toLowerCase();
        return name.includes(q) || phone.includes(q) || company.includes(q);
      });
    }

    return result;
  }, [eligibleContacts, filters, searchText, suggestions.length]);

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of filteredContacts) next.add(c.id);
      return next;
    });
  };

  const deselectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of filteredContacts) next.delete(c.id);
      return next;
    });
  };

  const addFilter = (f: FilterBubble) => {
    setFilters((prev) => [...prev, f]);
    setSearchText("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeFilter = (idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every((c) => selected.has(c.id));

  // Get status badges for a contact
  const getContactStatuses = (c: ContactForSelection) => {
    const seen = new Set<string>();
    return c.leads
      .filter((l) => {
        if (seen.has(l.status)) return false;
        seen.add(l.status);
        return true;
      })
      .map((l) => l.status);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-2xl border border-border-default bg-[#141820]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-text-primary">Add Existing Contacts</h2>
            <p className="mt-0.5 text-[11px] text-text-dim">
              {eligibleContacts.length} contacts available · {selected.size} selected
            </p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted">
            <X size={16} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="border-b border-border-default px-5 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              ref={inputRef}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions.length > 0) {
                  e.preventDefault();
                  addFilter(suggestions[0]);
                }
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              placeholder="Search name, phone, company — or type a status/campaign to filter..."
              className="w-full rounded-lg border border-border-default bg-surface-input py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-dim outline-none focus:border-text-dim"
            />
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border-default bg-[#1a1f2b] py-1 shadow-xl">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}`}
                    onClick={() => addFilter(s)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[rgba(255,255,255,0.05)]",
                      i === 0 && "bg-[rgba(255,255,255,0.03)]"
                    )}
                  >
                    <span className="text-text-dim">
                      {s.type === "status" ? "Filter by status:" : "Filter by campaign:"}
                    </span>
                    <span className="font-semibold text-text-primary">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter bubbles */}
          {filters.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filters.map((f, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.08)] px-2.5 py-1 text-[11px] font-medium text-text-primary"
                >
                  <span className="text-text-dim">
                    {f.type === "status" ? "Status:" : "Campaign:"}
                  </span>
                  {f.label}
                  <button
                    onClick={() => removeFilter(i)}
                    className="ml-0.5 text-text-dim hover:text-text-muted"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Select All / Deselect All */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-2">
          <span className="text-[11px] text-text-dim">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""} shown
          </span>
          <button
            onClick={allFilteredSelected ? deselectAll : selectAll}
            className="text-[11px] font-semibold text-emerald-light hover:underline"
          >
            {allFilteredSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-2 py-1" onClick={() => setShowSuggestions(false)}>
          {filteredContacts.length === 0 ? (
            <div className="py-10 text-center text-xs text-text-dim">
              No contacts match your search or filters.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = selected.has(c.id);
              const statuses = getContactStatuses(c);
              const name = c.last_name
                ? `${c.first_name} ${c.last_name}`
                : c.first_name;
              return (
                <button
                  key={c.id}
                  onClick={() => toggleContact(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-[rgba(167,139,250,0.08)]"
                      : "hover:bg-[rgba(255,255,255,0.03)]"
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-purple-light bg-purple-light"
                        : "border-border-default"
                    )}
                  >
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-text-primary">
                        {name}
                      </span>
                      {statuses.map((s) => (
                        <ColoredBadge key={s} color={STATUS_COLORS[s] ?? "default"}>
                          {LEAD_STATUSES.find((ls) => ls.value === s)?.label ?? s}
                        </ColoredBadge>
                      ))}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-dim">
                      <span>{c.phone}</span>
                      {c.company && <span>{c.company}</span>}
                      {c.leads.length > 0 && (
                        <span>
                          {c.leads.length} campaign{c.leads.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-text-primary">
            Cancel
          </button>
          <Button
            onClick={() => onConfirm(selected)}
            disabled={selected.size === 0}
            className="bg-emerald-dark px-6 text-xs text-white hover:bg-emerald-dark/90"
          >
            Add {selected.size} Contact{selected.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
