"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import { mockCampaigns } from "@/lib/mock-data";

const statusFilters = ["all", "active", "paused", "draft", "completed"] as const;

export function CampaignsClient() {
  const [filter, setFilter] = useState<string>("all");

  const list = filter === "all" ? mockCampaigns : mockCampaigns.filter((c) => c.status === filter);
  const totalBookings = mockCampaigns.reduce((s, c) => s + c.booked, 0);
  const totalLeads = mockCampaigns.reduce((s, c) => s + c.totalLeads, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Campaigns</h1>
        <Button asChild className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
          <Link href="/campaigns/new">
            <Plus size={15} /> New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {([
          [mockCampaigns.length, "Total", "text-text-primary"],
          [mockCampaigns.filter((c) => c.status === "active").length, "Active", "text-emerald-light"],
          [totalLeads, "Total Leads", "text-blue-light"],
          [totalBookings, "Bookings", "text-amber-light"],
        ] as const).map(([val, label, color]) => (
          <div key={label} className="rounded-xl border border-border-default bg-surface-card px-4 py-2.5 text-center">
            <div className={`text-lg font-bold tabular-nums ${color}`}>{val}</div>
            <div className="text-[10px] text-text-dim">{label}</div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1">
        {statusFilters.map((x) => (
          <button
            key={x}
            onClick={() => setFilter(x)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
              filter === x
                ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                : "bg-[rgba(255,255,255,0.03)] text-text-dim hover:text-text-muted"
            )}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Campaign cards */}
      <div className="flex flex-col gap-2.5">
        {list.map((c) => (
          <div key={c.id} className="rounded-xl border border-border-default bg-surface-card p-4 transition-all hover:bg-surface-card-hover">
            {/* Top row */}
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{c.name}</span>
                <ColoredBadge color={c.status === "active" ? "emerald" : c.status === "paused" ? "amber" : c.status === "completed" ? "blue" : "default"}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </ColoredBadge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-1 px-2 text-[10px]">
                  <Plus size={12} /> Leads
                </Button>
                {c.status === "active" && (
                  <Button variant="ghost" size="sm" className="px-2">
                    <Pause size={12} />
                  </Button>
                )}
                {c.status === "paused" && (
                  <Button size="sm" className="bg-emerald-dark px-2 text-white hover:bg-emerald-dark/90">
                    <Play size={12} />
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-2.5 text-[11px] text-text-dim">Agent: {c.agent}</div>

            {c.totalLeads > 0 ? (
              <>
                {/* Progress */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar value={c.callsMade} max={c.totalLeads} />
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-text-muted">
                    {c.callsMade}/{c.totalLeads} called · {Math.round((c.callsMade / c.totalLeads) * 100)}%
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-[rgba(52,211,153,0.12)] bg-emerald-bg px-3.5 py-2 text-center">
                    <div className="text-2xl font-extrabold leading-none tabular-nums text-emerald-light">{c.booked}</div>
                    <div className="mt-0.5 text-[9px] font-semibold text-emerald-light opacity-70">BOOKED</div>
                  </div>
                  <div className="grid flex-1 grid-cols-3 gap-3.5">
                    {([
                      [c.connected, "Connected", c.callsMade > 0 ? Math.round((c.connected / c.callsMade) * 100) + "%" : null],
                      [c.minutes + "m", "Duration", null],
                      [c.remaining, "Remaining", c.estCompletion !== "—" ? "~" + c.estCompletion : null],
                    ] as const).map(([val, label, sub]) => (
                      <div key={label}>
                        <div className="text-[15px] font-bold tabular-nums text-text-primary">{val}</div>
                        <div className="text-[9px] text-text-dim">
                          {label}
                          {sub && <span className="ml-1 text-emerald-light opacity-70">{sub}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs italic text-text-faint">No leads assigned yet</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
