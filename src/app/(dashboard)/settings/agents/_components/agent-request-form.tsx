"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const campaignGoals = [
  "Schedule Appointments",
  "Qualify Leads",
  "Collect Information",
  "Follow-up / Re-engage",
  "Custom / Other",
];

export function AgentRequestForm() {
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(
    new Set([0, 1])
  );

  const toggleGoal = (idx: number) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="max-w-[520px]">
      {/* Back header */}
      <div className="mb-5 flex items-center gap-2.5">
        <Link
          href="/settings/agents"
          className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1.5 text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={16} />
        </Link>
        <h2 className="text-lg font-bold text-text-primary">
          Request New Agent
        </h2>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-card p-6">
        <p className="mb-5 text-xs text-text-dim">
          Fill out the details below and our team will configure your new AI
          voice agent. You&apos;ll be notified when it&apos;s ready.
        </p>

        <FormField label="Agent Name" placeholder="e.g., Sarah — Mortgage Specialist" />
        <FormSelect
          label="Agent Type"
          defaultValue="Mortgage"
          options={["Mortgage", "Insurance", "Commercial Lending", "General Financial", "Custom"]}
        />
        <FormSelect
          label="Preferred Voice"
          defaultValue="Female"
          options={["Female", "Male"]}
        />
        <FormField
          label="Purpose & Description"
          placeholder="What should this agent do? Describe its role, tone, and focus area..."
          area
        />

        {/* Campaign Goals */}
        <div className="mb-3.5">
          <label className="mb-2 block text-xs font-medium text-text-dim">
            Campaign Goals
          </label>
          <div className="flex flex-col gap-1.5">
            {campaignGoals.map((g, i) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGoal(i)}
                className="flex items-center gap-2 text-left"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border-[1.5px] transition-colors ${
                    selectedGoals.has(i)
                      ? "border-emerald-light bg-emerald-dark"
                      : "border-[rgba(255,255,255,0.15)] bg-transparent"
                  }`}
                >
                  {selectedGoals.has(i) && (
                    <Check size={10} className="text-white" />
                  )}
                </div>
                <span className="text-[13px] text-text-primary">{g}</span>
              </button>
            ))}
          </div>
        </div>

        <FormField
          label="Preferred Greeting"
          placeholder="e.g., Hi, this is Sarah calling from Courtside Finance..."
        />
        <FormField
          label="Additional Notes"
          placeholder="Objection handling, booking rules, anything else..."
          area
        />

        <div className="mt-2 flex gap-2.5">
          <Button
            asChild
            variant="ghost"
            className="flex-1 justify-center border border-border-default bg-[rgba(255,255,255,0.03)] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            <Link href="/settings/agents">Cancel</Link>
          </Button>
          <Button
            asChild
            className="flex-1 justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
          >
            <Link href="/settings/agents">Submit Request</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  defaultValue,
  area,
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  area?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none font-[inherit] resize-vertical";
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      {area ? (
        <textarea
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className={cls}
        />
      ) : (
        <input
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function FormSelect({
  label,
  defaultValue,
  options,
}: {
  label: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <select
        defaultValue={defaultValue}
        className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
