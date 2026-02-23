"use client";

import { useState, useTransition } from "react";
import { DollarSign, Users, AlertTriangle, XCircle, Search } from "lucide-react";
import { cancelSubscription } from "@/lib/actions/admin-billing";

type BillingStats = {
  mrr: number;
  active: number;
  pastDue: number;
  canceled: number;
};

type SubRow = {
  id: string;
  org_id: string;
  status: string;
  plan_name: string | null;
  price_monthly: number | null;
  call_minutes_used: number;
  call_minutes_limit: number;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  orgName: string;
  stripeCustomerId: string | null;
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Active" },
  past_due: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Past Due" },
  canceled: { bg: "bg-red-400/10", text: "text-red-400", label: "Canceled" },
  trialing: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Trialing" },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? { bg: "bg-white/5", text: "text-text-dim", label: status };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function BillingClient({
  stats,
  subscriptions,
}: {
  stats: BillingStats;
  subscriptions: SubRow[];
}) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const filtered = subscriptions.filter(
    (sub) =>
      search === "" || sub.orgName.toLowerCase().includes(search.toLowerCase())
  );

  function handleCancel(stripeSubId: string, subId: string) {
    if (!confirm("Cancel this subscription at period end?")) return;
    setCancelingId(subId);
    startTransition(async () => {
      const result = await cancelSubscription(stripeSubId);
      if (result.error) {
        alert(`Error: ${result.error}`);
      }
      setCancelingId(null);
    });
  }

  const statCards = [
    {
      label: "MRR",
      value: formatCurrency(stats.mrr),
      icon: DollarSign,
      color: "text-emerald-400",
      borderColor: "border-emerald-400/40",
    },
    {
      label: "ACTIVE",
      value: stats.active,
      icon: Users,
      color: "text-blue-400",
      borderColor: "border-blue-400/40",
    },
    {
      label: "PAST DUE",
      value: stats.pastDue,
      icon: AlertTriangle,
      color: "text-amber-400",
      borderColor: "border-amber-400/40",
    },
    {
      label: "CANCELED",
      value: stats.canceled,
      icon: XCircle,
      color: "text-red-400",
      borderColor: "border-red-400/40",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">Billing</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border-t-2 ${card.borderColor} bg-surface-card p-4`}
          >
            <div className="flex items-center gap-2">
              <card.icon size={14} className={card.color} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                {card.label}
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          placeholder="Search by org name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border-default bg-surface-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-dim focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
        />
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-x-auto rounded-xl bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Org Name
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Status
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Price/mo
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Usage
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Period End
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <DollarSign size={24} className="mx-auto mb-2 text-text-dim" />
                  <p className="text-sm text-text-dim">No subscriptions found.</p>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const usagePct =
                  sub.call_minutes_limit > 0
                    ? Math.min(
                        100,
                        Math.round((sub.call_minutes_used / sub.call_minutes_limit) * 100)
                      )
                    : 0;

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-card-hover"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{sub.orgName}</td>
                    <td className="px-4 py-3 text-text-muted">{sub.plan_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {sub.price_monthly != null ? formatCurrency(sub.price_monthly) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-[5px] w-16 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${
                              usagePct >= 90
                                ? "bg-red-400"
                                : usagePct >= 70
                                  ? "bg-amber-400"
                                  : "bg-emerald-400"
                            }`}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-dim">
                          {sub.call_minutes_used}/{sub.call_minutes_limit}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub.status === "active" && sub.stripe_subscription_id && (
                        <button
                          onClick={() => handleCancel(sub.stripe_subscription_id!, sub.id)}
                          disabled={isPending && cancelingId === sub.id}
                          className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                        >
                          {isPending && cancelingId === sub.id ? "Canceling..." : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
