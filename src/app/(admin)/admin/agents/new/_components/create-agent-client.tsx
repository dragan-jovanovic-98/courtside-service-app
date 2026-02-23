"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { createAgent } from "@/lib/actions/admin";

type Org = { id: string; name: string };

export function CreateAgentClient({ organizations }: { organizations: Org[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAgent(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/admin/agents");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/agents"
          className="rounded-lg p-2 text-text-dim transition-colors hover:bg-surface-card-hover hover:text-text-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-amber-400" />
          <h1 className="text-xl font-semibold text-text-primary">Create Agent</h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-surface-card p-6">
        {/* Organization */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Organization *
          </label>
          <select
            name="org_id"
            required
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
          >
            <option value="">Select organization...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Agent Name *
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Sarah - Outbound Mortgage"
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
          />
        </div>

        {/* Status + Direction row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
              Status
            </label>
            <select
              name="status"
              defaultValue="pending"
              className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
              Direction
            </label>
            <select
              name="direction"
              defaultValue="outbound"
              className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
            >
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
        </div>

        {/* Voice */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Voice
          </label>
          <input
            name="voice"
            placeholder="e.g. alloy, nova, shimmer"
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Phone Number
          </label>
          <input
            name="phone_number"
            placeholder="+18005551234"
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
          />
        </div>

        {/* Greeting */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Greeting
          </label>
          <textarea
            name="greeting"
            rows={2}
            placeholder="Opening message the agent uses when the call connects..."
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50 resize-none"
          />
        </div>

        {/* Purpose */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Purpose
          </label>
          <textarea
            name="purpose"
            rows={2}
            placeholder="The agent's primary objective..."
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50 resize-none"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Internal notes about this agent..."
            className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Agent"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
