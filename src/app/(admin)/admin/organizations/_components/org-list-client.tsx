"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2 } from "lucide-react";

type OrgRow = {
  id: string;
  name: string;
  industry: string | null;
  createdAt: string;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  agentCount: number;
  verificationStatus: string;
};

const verificationOptions = [
  { label: "All", value: "all" },
  { label: "Not Started", value: "not_started" },
  { label: "In Progress", value: "in_progress" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function VerificationBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Approved" },
    in_progress: { bg: "bg-amber-400/10", text: "text-amber-400", label: "In Progress" },
    rejected: { bg: "bg-red-400/10", text: "text-red-400", label: "Rejected" },
    not_started: { bg: "bg-white/5", text: "text-text-dim", label: "Not Started" },
  };
  const c = config[status] ?? config.not_started;

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

export function OrgListClient({ organizations }: { organizations: OrgRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = organizations.filter((org) => {
    const matchesSearch =
      search === "" ||
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.ownerEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || org.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Organizations</h1>
        <span className="text-sm text-text-dim">{filtered.length} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <input
            type="text"
            placeholder="Search by name or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-dim focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        >
          {verificationOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Name
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Industry
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Verification
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Members
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Agents
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Building2 size={24} className="mx-auto mb-2 text-text-dim" />
                  <p className="text-sm text-text-dim">No organizations found.</p>
                </td>
              </tr>
            ) : (
              filtered.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                  className="cursor-pointer border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-card-hover"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{org.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-text-primary">{org.ownerName}</div>
                    <div className="text-xs text-text-dim">{org.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{org.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <VerificationBadge status={org.verificationStatus} />
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">{org.memberCount}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{org.agentCount}</td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
