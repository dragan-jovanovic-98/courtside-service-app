"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { mockAgents } from "@/lib/mock-data";

const STEPS = ["Select Agent", "Add Leads", "Schedule", "Review"];

const defaultSchedule = [
  { day: "Monday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Tuesday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Wednesday", on: true, slots: [["9:00 AM", "11:00 AM"], ["6:00 PM", "8:00 PM"]] },
  { day: "Thursday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
  { day: "Friday", on: true, slots: [["5:00 PM", "8:00 PM"]] },
  { day: "Saturday", on: true, slots: [["12:00 PM", "4:00 PM"]] },
  { day: "Sunday", on: false, slots: [] as string[][] },
];

export function CampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

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

      {/* Step 1: Select Agent */}
      {step === 1 && (
        <div>
          <p className="mb-4 text-[13px] text-text-muted">Choose the AI agent for this campaign.</p>
          {mockAgents.map((a) => (
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
            {([["Upload CSV", "Drag & drop or browse"], ["Existing Leads", "Select from contacts"]] as const).map(([title, desc]) => (
              <div key={title} className="cursor-pointer rounded-xl border-2 border-dashed border-border-default p-8 text-center hover:border-text-dim">
                <div className="text-[13px] font-semibold text-text-muted">{title}</div>
                <div className="mt-1 text-[11px] text-text-dim">{desc}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border-default bg-surface-card p-3.5">
            <div className="text-xs text-text-dim">Preview: 150 leads · 3 DNC excluded</div>
            <div className="mt-1 text-[11px] text-emerald-light opacity-70">DNC check passed</div>
          </div>
          <Button
            onClick={() => setStep(3)}
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
              {defaultSchedule.map((day) => (
                <div key={day.day} className="flex items-center gap-2.5 border-b border-border-light py-1.5">
                  {/* Toggle */}
                  <div
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
                            <button className="ml-0.5 flex text-text-dim hover:text-text-muted">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button className="flex items-center gap-0.5 rounded-md border border-dashed border-border-default px-2 py-[3px] text-[10px] text-text-dim hover:text-text-muted">
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
            {([
              ["Daily Limit", "150", "calls/day"],
              ["Retries", "2", "per lead"],
              ["Timezone", "EST", "Toronto"],
            ] as const).map(([label, val, sub]) => (
              <div key={label} className="rounded-xl border border-border-default bg-surface-card p-3">
                <div className="text-[11px] text-text-dim">{label}</div>
                <div className="text-lg font-bold text-text-primary">{val}</div>
                <div className="text-[9px] text-text-faint">{sub}</div>
              </div>
            ))}
            <div className="rounded-xl border border-border-default bg-surface-card p-3">
              <div className="text-[11px] text-text-dim">End Date</div>
              <div className="text-[13px] font-semibold text-text-primary">Optional</div>
              <input
                type="date"
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
                ["Campaign", campaignName || "Spring Mortgage"],
                ["Agent", mockAgents.find((a) => a.id === agentId)?.name || "Sarah"],
                ["Leads", "147"],
                ["DNC Removed", "3"],
                ["Schedule", "Mon–Sat, per-day slots"],
                ["Limit", "150/day"],
                ["Est. Duration", "~2 days"],
                ["Retries", "2 × 24hr"],
              ] as const).map(([label, val]) => (
                <div key={label}>
                  <span className="block text-[11px] text-text-dim">{label}</span>
                  <span className={cn("text-[13px] font-semibold", label === "DNC Removed" ? "text-red-light" : "text-text-primary")}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button asChild variant="ghost" className="flex-1 justify-center">
              <Link href="/campaigns">Save Draft</Link>
            </Button>
            <Button asChild className="flex-1 justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90">
              <Link href="/campaigns">Save &amp; Activate</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
