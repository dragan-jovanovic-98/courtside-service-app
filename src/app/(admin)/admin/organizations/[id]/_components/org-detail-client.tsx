"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Bot,
  Megaphone,
  CreditCard,
  ShieldCheck,
  LogIn,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

type Org = {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
  [key: string]: unknown;
};

type Member = {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: string;
  status: string;
  created_at: string;
};

type Agent = {
  id: string;
  name: string;
  status: string;
  direction: string;
  total_calls: number;
  total_bookings: number;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  calls_made: number;
  bookings: number;
  created_at: string;
};

type Subscription = {
  id: string;
  status: string;
  plan_name: string;
  price_monthly: number;
  call_minutes_used: number;
  call_minutes_limit: number;
  current_period_end: string | null;
  [key: string]: unknown;
} | null;

type Verification = {
  id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  [key: string]: unknown;
} | null;

/* ── Badge helpers ─────────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    owner: { bg: "bg-amber-400/10", text: "text-amber-400" },
    admin: { bg: "bg-blue-400/10", text: "text-blue-400" },
    member: { bg: "bg-white/5", text: "text-text-dim" },
  };
  const c = config[role] ?? config.member;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
    inactive: { bg: "bg-red-400/10", text: "text-red-400" },
    pending: { bg: "bg-amber-400/10", text: "text-amber-400" },
  };
  const c = config[status] ?? { bg: "bg-white/5", text: "text-text-dim" };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
    paused: { bg: "bg-amber-400/10", text: "text-amber-400" },
    draft: { bg: "bg-white/5", text: "text-text-dim" },
    completed: { bg: "bg-blue-400/10", text: "text-blue-400" },
  };
  const c = config[status] ?? { bg: "bg-white/5", text: "text-text-dim" };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Approved" },
    in_progress: { bg: "bg-amber-400/10", text: "text-amber-400", label: "In Progress" },
    rejected: { bg: "bg-red-400/10", text: "text-red-400", label: "Rejected" },
    not_started: { bg: "bg-white/5", text: "text-text-dim", label: "Not Started" },
  };
  const c = config[status] ?? config.not_started;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

/* ── Section label ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
      {children}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */

export function OrgDetailClient({
  org,
  members,
  agents,
  campaigns,
  subscription,
  verification,
}: {
  org: Org;
  members: Member[];
  agents: Agent[];
  campaigns: Campaign[];
  subscription: Subscription;
  verification: Verification;
}) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to Organizations
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{org.name}</h1>
          <p className="mt-0.5 text-sm text-text-dim">
            {org.industry ?? "No industry"} &middot; Created{" "}
            {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-400 opacity-50 cursor-not-allowed"
        >
          <LogIn size={14} />
          Impersonate
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Members", value: members.length, icon: Users, color: "text-blue-400", border: "border-blue-400/40" },
          { label: "Agents", value: agents.length, icon: Bot, color: "text-purple-400", border: "border-purple-400/40" },
          { label: "Campaigns", value: campaigns.length, icon: Megaphone, color: "text-emerald-400", border: "border-emerald-400/40" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border-t-2 ${card.border} bg-surface-card p-4`}
          >
            <div className="flex items-center gap-2">
              <card.icon size={14} className={card.color} />
              <SectionLabel>{card.label}</SectionLabel>
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div className="rounded-xl bg-surface-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-text-primary">Members</h2>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-text-dim">No members.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Name</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Email</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Role</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Status</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border-default last:border-b-0 transition-colors hover:bg-surface-card-hover"
                  >
                    <td className="px-4 py-2 font-medium text-text-primary">
                      {[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-text-muted">{m.email}</td>
                    <td className="px-4 py-2"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-2 text-right text-text-muted">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agents table */}
      <div className="rounded-xl bg-surface-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bot size={14} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-text-primary">Agents</h2>
        </div>
        {agents.length === 0 ? (
          <p className="text-sm text-text-dim">No agents configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Name</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Status</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Direction</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Calls</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border-default last:border-b-0 transition-colors hover:bg-surface-card-hover"
                  >
                    <td className="px-4 py-2 font-medium text-text-primary">{a.name}</td>
                    <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-2 text-text-muted capitalize">{a.direction}</td>
                    <td className="px-4 py-2 text-right text-text-muted">{a.total_calls}</td>
                    <td className="px-4 py-2 text-right text-text-muted">{a.total_bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaigns table */}
      <div className="rounded-xl bg-surface-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone size={14} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-text-primary">Campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-text-dim">No campaigns created.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Name</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Status</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Leads</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Calls Made</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border-default last:border-b-0 transition-colors hover:bg-surface-card-hover"
                  >
                    <td className="px-4 py-2 font-medium text-text-primary">{c.name}</td>
                    <td className="px-4 py-2"><CampaignStatusBadge status={c.status} /></td>
                    <td className="px-4 py-2 text-right text-text-muted">{c.total_leads}</td>
                    <td className="px-4 py-2 text-right text-text-muted">{c.calls_made}</td>
                    <td className="px-4 py-2 text-right text-text-muted">{c.bookings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row: Subscription + Verification */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <div className="rounded-xl bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={14} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-text-primary">Subscription</h2>
          </div>
          {!subscription ? (
            <p className="text-sm text-text-dim">No subscription found.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dim">Plan</span>
                <span className="text-sm font-medium text-text-primary">
                  {subscription.plan_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dim">Status</span>
                <StatusBadge status={subscription.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dim">Price</span>
                <span className="text-sm font-medium text-text-primary">
                  ${subscription.price_monthly}/mo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dim">Usage</span>
                <span className="text-sm text-text-muted">
                  {subscription.call_minutes_used} / {subscription.call_minutes_limit} min
                </span>
              </div>
              {subscription.current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-dim">Period Ends</span>
                  <span className="text-sm text-text-muted">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="rounded-xl bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-text-primary">Verification</h2>
          </div>
          {!verification ? (
            <p className="text-sm text-text-dim">No verification record.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-dim">Status</span>
                <VerificationBadge status={verification.status} />
              </div>
              {verification.submitted_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-dim">Submitted</span>
                  <span className="text-sm text-text-muted">
                    {new Date(verification.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {verification.reviewed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-dim">Reviewed</span>
                  <span className="text-sm text-text-muted">
                    {new Date(verification.reviewed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
