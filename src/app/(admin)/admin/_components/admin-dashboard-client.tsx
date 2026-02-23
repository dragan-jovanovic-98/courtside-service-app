"use client";

import { Building2, CreditCard, Phone, ShieldCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Stats = {
  totalOrganizations: number;
  activeSubscriptions: number;
  totalCalls30d: number;
  pendingVerifications: number;
};

type Signup = {
  id: string;
  name: string;
  createdAt: string;
  industry: string | null;
  ownerEmail: string;
  ownerName: string;
};

type WorkflowError = {
  id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  org_id: string | null;
};

export function AdminDashboardClient({
  stats,
  recentSignups,
  recentErrors,
}: {
  stats: Stats;
  recentSignups: Signup[];
  recentErrors: WorkflowError[];
}) {
  const statCards = [
    {
      label: "ORGANIZATIONS",
      value: stats.totalOrganizations,
      icon: Building2,
      color: "text-blue-400",
      borderColor: "border-blue-400/40",
      href: "/admin/organizations",
    },
    {
      label: "ACTIVE SUBS",
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: "text-emerald-400",
      borderColor: "border-emerald-400/40",
      href: "/admin/billing",
    },
    {
      label: "CALLS (30D)",
      value: stats.totalCalls30d.toLocaleString(),
      icon: Phone,
      color: "text-purple-400",
      borderColor: "border-purple-400/40",
      href: "#",
    },
    {
      label: "PENDING VERIFICATION",
      value: stats.pendingVerifications,
      icon: ShieldCheck,
      color: "text-amber-400",
      borderColor: "border-amber-400/40",
      href: "/admin/verification",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border-t-2 ${card.borderColor} bg-surface-card p-4 transition-colors hover:bg-surface-card-hover`}
          >
            <div className="flex items-center gap-2">
              <card.icon size={14} className={card.color} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                {card.label}
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{card.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="rounded-xl bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Signups</h2>
            <Link
              href="/admin/organizations"
              className="text-xs text-amber-400 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-text-dim">No organizations yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSignups.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/organizations/${org.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-surface-card-hover"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">{org.name}</div>
                    <div className="text-xs text-text-dim">{org.ownerEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-dim">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </div>
                    {org.industry && (
                      <div className="text-[10px] text-text-dim">{org.industry}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Workflow Errors */}
        <div className="rounded-xl bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Errors</h2>
            <Link
              href="/admin/system"
              className="text-xs text-amber-400 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-text-dim">No errors. All systems nominal.</p>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg px-3 py-2 transition-colors hover:bg-surface-card-hover"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-400" />
                    <span className="text-sm font-medium text-text-primary">
                      {event.event_type}
                    </span>
                    <span className="text-xs text-text-dim">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  {event.error_message && (
                    <div className="mt-1 truncate text-xs text-red-400/80">
                      {event.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
