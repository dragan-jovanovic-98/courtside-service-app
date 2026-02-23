"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Bot, Phone } from "lucide-react";

type AgentRow = {
  id: string;
  name: string;
  status: string;
  direction: string;
  voice: string | null;
  phone_number: string | null;
  total_calls: number;
  total_bookings: number;
  org_id: string;
  orgName: string;
  created_at: string;
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  pending: { bg: "bg-amber-400/10", text: "text-amber-400" },
  inactive: { bg: "bg-red-400/10", text: "text-red-400" },
};

const directionColors: Record<string, { bg: string; text: string }> = {
  inbound: { bg: "bg-blue-400/10", text: "text-blue-400" },
  outbound: { bg: "bg-purple-400/10", text: "text-purple-400" },
};

export function AgentListClient({ agents }: { agents: AgentRow[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");

  const filtered = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (directionFilter !== "all" && a.direction !== directionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Agents</h1>
        <Link
          href="/admin/agents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          <Plus size={16} />
          New Agent
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-amber-400/50"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Direction
          </span>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-amber-400/50"
          >
            <option value="all">All</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>

        <span className="ml-auto text-xs text-text-dim">
          {filtered.length} agent{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface-card py-16">
          <Bot size={32} className="text-text-dim" />
          <p className="mt-3 text-sm text-text-muted">No agents found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Direction
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Phone
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Total Calls
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Bookings
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent, i) => {
                const sc = statusColors[agent.status] ?? statusColors.inactive;
                const dc = directionColors[agent.direction] ?? directionColors.outbound;

                return (
                  <tr
                    key={agent.id}
                    className={`border-b border-border-default transition-colors hover:bg-surface-card-hover ${
                      i % 2 === 1 ? "bg-white/[0.015]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-text-dim" />
                        <span className="font-medium text-text-primary">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{agent.orgName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.text}`}
                      >
                        {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${dc.bg} ${dc.text}`}
                      >
                        {agent.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {agent.phone_number ? (
                        <div className="flex items-center gap-1 text-text-muted">
                          <Phone size={12} />
                          <span>{agent.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-text-dim">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {agent.total_calls.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {agent.total_bookings.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
