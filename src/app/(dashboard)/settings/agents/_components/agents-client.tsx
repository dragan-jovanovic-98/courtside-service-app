"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { mockSettingsAgents } from "@/lib/mock-data";

export function AgentsClient() {
  const activeCount = mockSettingsAgents.filter((a) => a.status === "active").length;
  const pendingCount = mockSettingsAgents.filter((a) => a.status === "pending").length;

  return (
    <div className="max-w-[600px]">
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <span className="text-[13px] text-text-muted">
            Your AI voice agents.
          </span>
          <div className="mt-0.5 text-[11px] text-text-dim">
            {activeCount} active &middot; {pendingCount} pending setup
          </div>
        </div>
        <Button asChild className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
          <Link href="/settings/agents/new">
            <Plus size={13} /> Request New Agent
          </Link>
        </Button>
      </div>

      {/* Agent cards */}
      {mockSettingsAgents.map((ag, i) => (
        <div
          key={i}
          className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-[18px]"
        >
          <div className="mb-2.5 flex items-start justify-between">
            <div>
              <div className="text-[15px] font-semibold text-text-primary">
                {ag.name}
              </div>
              <div className="mt-1 flex gap-1.5">
                <ColoredBadge color={ag.status === "active" ? "emerald" : "amber"}>
                  {ag.status === "active" ? "Active" : "Pending Setup"}
                </ColoredBadge>
                <ColoredBadge
                  color={
                    ag.type === "Mortgage"
                      ? "blue"
                      : ag.type === "Insurance"
                        ? "purple"
                        : "default"
                  }
                >
                  {ag.type}
                </ColoredBadge>
                <ColoredBadge color={ag.direction === "inbound" ? "blue" : "default"}>
                  {ag.direction === "inbound" ? "Inbound" : "Outbound"}
                </ColoredBadge>
              </div>
            </div>
            {ag.status === "active" && (
              <div className="text-right">
                <div className="text-[22px] font-extrabold leading-none text-emerald-light">
                  {ag.booked}
                </div>
                <div className="text-[9px] font-semibold text-emerald-light opacity-70">
                  BOOKED
                </div>
              </div>
            )}
          </div>

          {ag.status === "active" ? (
            <div
              className={`grid gap-2.5 ${
                ag.direction === "inbound" ? "grid-cols-4" : "grid-cols-3"
              }`}
            >
              {[
                [ag.calls, "Total Calls"],
                [ag.rate, "Book Rate"],
                [ag.campaigns, "Campaigns"],
                ...(ag.direction === "inbound" && ag.phone
                  ? [[ag.phone, "Dedicated Line"] as const]
                  : []),
              ].map(([val, label]) => (
                <div key={label as string}>
                  <div className="text-[13px] font-semibold tabular-nums text-text-primary">
                    {val}
                  </div>
                  <div className="text-[10px] text-text-dim">
                    {label as string}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[rgba(251,191,36,0.12)] bg-[rgba(251,191,36,0.06)] px-3.5 py-2.5">
              <div className="text-xs text-amber-light">
                Agent setup in progress. Our team is configuring this agent and
                will notify you when it&apos;s ready.
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
