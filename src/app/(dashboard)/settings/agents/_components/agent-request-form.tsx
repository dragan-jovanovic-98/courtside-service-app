"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import Link from "next/link";

const campaignGoals = [
  "Schedule Appointments",
  "Qualify Leads",
  "Collect Information",
  "Follow-up / Re-engage",
  "Custom / Other",
];

export function AgentRequestForm() {
  const router = useRouter();
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(
    new Set([0, 1])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (idx: number) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string)?.trim();
    if (!name) {
      setError("Agent name is required");
      setSubmitting(false);
      return;
    }

    const { error: err } = await callEdgeFunction("submit-agent-request", {
      name,
      direction: form.get("direction") as string,
      agent_type: form.get("agent_type") as string,
      voice_gender: form.get("voice_gender") as string,
      purpose_description: (form.get("purpose_description") as string) || null,
      campaign_goals: [...selectedGoals].map((i) => campaignGoals[i]),
      preferred_greeting: (form.get("preferred_greeting") as string) || null,
      additional_notes: (form.get("additional_notes") as string) || null,
    });

    setSubmitting(false);

    if (err) {
      setError(err);
    } else {
      router.push("/settings/agents");
      router.refresh();
    }
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

        {error && (
          <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-red-light">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField name="name" label="Agent Name" placeholder="e.g., Sarah — Mortgage Specialist" required />
          <FormSelect
            name="agent_type"
            label="Agent Type"
            defaultValue="Mortgage"
            options={["Mortgage", "Insurance", "Commercial Lending", "General Financial", "Custom"]}
          />
          <FormSelect
            name="direction"
            label="Direction"
            defaultValue="outbound"
            options={[
              { value: "outbound", label: "Outbound" },
              { value: "inbound", label: "Inbound" },
            ]}
          />
          <FormSelect
            name="voice_gender"
            label="Preferred Voice"
            defaultValue="Female"
            options={["Female", "Male"]}
          />
          <FormField
            name="purpose_description"
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
            name="preferred_greeting"
            label="Preferred Greeting"
            placeholder="e.g., Hi, this is Sarah calling from Courtside Finance..."
          />
          <FormField
            name="additional_notes"
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
              type="submit"
              disabled={submitting}
              className="flex-1 justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  name,
  label,
  placeholder,
  defaultValue,
  area,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  area?: boolean;
  required?: boolean;
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
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className={cls}
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
    </div>
  );
}

function FormSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      >
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}
