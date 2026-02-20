"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";

type AgentOption = { id: string; name: string; tag: string; description: string };
type ScheduleDay = { day: string; on: boolean; slots: string[][] };

const STEPS = ["Select Agent", "Add Leads", "Schedule", "Review"];

const makeDefaultSchedule = (): ScheduleDay[] => [
  { day: "Monday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Tuesday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Wednesday", on: true, slots: [["9:00 AM", "11:00 AM"], ["6:00 PM", "8:00 PM"]] },
  { day: "Thursday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Friday", on: true, slots: [["5:00 PM", "8:00 PM"]] },
  { day: "Saturday", on: true, slots: [["12:00 PM", "4:00 PM"]] },
  { day: "Sunday", on: false, slots: [] },
];

export function CampaignWizard({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

  // Step 2: CSV
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvRowCount, setCsvRowCount] = useState(0);

  // Step 3: Schedule & rules
  const [schedule, setSchedule] = useState<ScheduleDay[]>(makeDefaultSchedule);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [maxRetries, setMaxRetries] = useState(2);
  const [timezone, setTimezone] = useState("America/Toronto");
  const [endDate, setEndDate] = useState("");

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
        i === dayIdx ? { ...d, on: !d.on, slots: d.on ? [] : [["6:00 PM", "8:00 PM"]] } : d
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

  const addSlot = (dayIdx: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, slots: [...d.slots, ["6:00 PM", "8:00 PM"]] } : d
      )
    );
  };

  const activeDays = schedule.filter((d) => d.on).map((d) => d.day.slice(0, 3)).join(", ");

  const handleSubmit = async (activate: boolean) => {
    if (!agentId || !campaignName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create campaign as draft
      const schedulePayload = schedule
        .filter((d) => d.on)
        .map((d) => ({
          day_of_week: d.day.toLowerCase(),
          slots: d.slots.map(([start, end]) => ({ start_time: start, end_time: end })),
        }));

      const { data: campaign, error: createErr } = await callEdgeFunction<{ id: string }>(
        "create-campaign",
        {
          name: campaignName.trim(),
          agent_id: agentId,
          status: "draft",
          daily_limit: dailyLimit,
          max_retries: maxRetries,
          timezone,
          end_date: endDate || null,
          schedule: schedulePayload,
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
          csv_text: csvText,
        });
        if (importErr) {
          setError(`Campaign created but lead import failed: ${importErr}`);
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
          <div className="mb-3 grid grid-cols-2 gap-2.5">
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
            {/* Existing Leads placeholder */}
            <div className="cursor-not-allowed rounded-xl border-2 border-dashed border-border-default p-8 text-center opacity-50">
              <div className="text-[13px] font-semibold text-text-muted">Existing Leads</div>
              <div className="mt-1 text-[11px] text-text-dim">Coming soon</div>
            </div>
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
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                      {day.slots.map((s, si) => (
                        <div key={si} className="flex items-center gap-1 rounded-md border border-border-light bg-surface-input px-2 py-[3px]">
                          <span className="text-[11px] tabular-nums text-text-primary">{s[0]}</span>
                          <span className="text-[10px] text-text-dim">→</span>
                          <span className="text-[11px] tabular-nums text-text-primary">{s[1]}</span>
                          {day.slots.length > 1 && (
                            <button
                              onClick={() => removeSlot(dayIdx, si)}
                              className="ml-0.5 flex text-text-dim hover:text-text-muted"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addSlot(dayIdx)}
                        className="flex items-center gap-0.5 rounded-md border border-dashed border-border-default px-2 py-[3px] text-[10px] text-text-dim hover:text-text-muted"
                      >
                        <Plus size={9} /> Add slot
                      </button>
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
                ["Leads", csvRowCount > 0 ? String(csvRowCount) : "None"],
                ["Schedule", activeDays || "None"],
                ["Limit", `${dailyLimit}/day`],
                ["Retries", `${maxRetries} per lead`],
                ["Timezone", timezone.split("/")[1]?.replace("_", " ") ?? timezone],
                ["End Date", endDate || "None"],
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
    </div>
  );
}
