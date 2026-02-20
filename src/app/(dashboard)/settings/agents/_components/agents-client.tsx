"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";

type AgentRow = {
  id: string;
  name: string;
  agent_type: string | null;
  direction: "inbound" | "outbound";
  status: "active" | "pending" | "inactive";
  total_calls: number;
  total_bookings: number;
  booking_rate: number;
  campaign_count: number;
  phone_number_id: string | null;
};

export function AgentsClient({ agents }: { agents: AgentRow[] }) {
  const activeCount = agents.filter((a) => a.status === "active").length;
  const pendingCount = agents.filter((a) => a.status === "pending").length;

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

      {agents.length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-card px-5 py-8 text-center text-[13px] text-text-dim">
          No agents yet. Request your first AI voice agent to get started.
        </div>
      )}

      {/* Agent cards */}
      {agents.map((ag) => {
        const typeLabel = ag.agent_type ?? "General";
        const rateDisplay = ag.total_calls > 0
          ? `${ag.booking_rate.toFixed(1)}%`
          : "—";

        return (
          <div
            key={ag.id}
            className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-[18px]"
          >
            <div className="mb-2.5 flex items-start justify-between">
              <div>
                <div className="text-[15px] font-semibold text-text-primary">
                  {ag.name}
                </div>
                <div className="mt-1 flex gap-1.5">
                  <ColoredBadge color={ag.status === "active" ? "emerald" : ag.status === "pending" ? "amber" : "default"}>
                    {ag.status === "active" ? "Active" : ag.status === "pending" ? "Pending Setup" : "Inactive"}
                  </ColoredBadge>
                  <ColoredBadge
                    color={
                      typeLabel === "Mortgage"
                        ? "blue"
                        : typeLabel === "Insurance"
                          ? "purple"
                          : "default"
                    }
                  >
                    {typeLabel}
                  </ColoredBadge>
                  <ColoredBadge color={ag.direction === "inbound" ? "blue" : "default"}>
                    {ag.direction === "inbound" ? "Inbound" : "Outbound"}
                  </ColoredBadge>
                </div>
              </div>
              {ag.status === "active" && (
                <div className="text-right">
                  <div className="text-[22px] font-extrabold leading-none text-emerald-light">
                    {ag.total_bookings}
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
                <div>
                  <div className="text-[13px] font-semibold tabular-nums text-text-primary">
                    {ag.total_calls}
                  </div>
                  <div className="text-[10px] text-text-dim">Total Calls</div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold tabular-nums text-text-primary">
                    {rateDisplay}
                  </div>
                  <div className="text-[10px] text-text-dim">Book Rate</div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold tabular-nums text-text-primary">
                    {ag.campaign_count}
                  </div>
                  <div className="text-[10px] text-text-dim">Campaigns</div>
                </div>
                {ag.direction === "inbound" && ag.phone_number_id && (
                  <div>
                    <div className="text-[13px] font-semibold tabular-nums text-text-primary">
                      Assigned
                    </div>
                    <div className="text-[10px] text-text-dim">Dedicated Line</div>
                  </div>
                )}
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
        );
      })}
    </div>
  );
}
