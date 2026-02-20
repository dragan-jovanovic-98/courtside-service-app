"use client";

import { ColoredBadge } from "@/components/ui/colored-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/section-label";
import { tokens } from "@/lib/design-tokens";

type Subscription = {
  plan: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  amount: number | null;
} | null;

type Invoice = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  invoice_url: string | null;
  period_label: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export function BillingClient({
  subscription,
  invoices,
}: {
  subscription: Subscription;
  invoices: Invoice[];
}) {
  const planName = subscription?.plan ?? "Free";
  const planStatus = subscription?.status ?? "none";
  const renewalDate = formatDate(subscription?.current_period_end ?? null);
  const monthlyAmount = subscription?.amount
    ? formatCurrency(subscription.amount)
    : "$0";

  return (
    <div className="max-w-[520px]">
      {/* Plan card with emerald gradient */}
      <div className="mb-4 rounded-xl border border-[rgba(52,211,153,0.15)] bg-[linear-gradient(135deg,rgba(52,211,153,0.08)_0%,transparent_70%)] p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-light opacity-60">
              Current Plan
            </div>
            <div className="text-[22px] font-bold text-text-primary">
              {planName}
            </div>
            <div className="mt-0.5 text-xs text-text-dim">
              {subscription ? (
                <>
                  {monthlyAmount}/mo &middot; Renews {renewalDate}
                </>
              ) : (
                "No active subscription"
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {planStatus !== "none" && (
              <ColoredBadge color={planStatus === "active" ? "emerald" : "amber"}>
                {planStatus}
              </ColoredBadge>
            )}
          </div>
        </div>

        <div className="mb-3.5">
          <div className="mb-1.5 flex justify-between text-xs text-text-dim">
            <span>AI Call Minutes</span>
            <span className="font-semibold text-text-primary">—</span>
          </div>
          <ProgressBar value={0} max={100} color={tokens.emerald} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-text-dim">
            <span>Phone Numbers</span>
            <span className="font-semibold text-text-primary">—</span>
          </div>
          <ProgressBar value={0} max={100} color={tokens.blue} />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            [monthlyAmount, "Monthly Cost", "text-text-primary"],
            ["—", "Per Extra Min", "text-amber-light"],
            ["—", "Saved vs. Manual", "text-emerald-light"],
          ] as const
        ).map(([val, label, color]) => (
          <div
            key={label}
            className="rounded-xl border border-border-default bg-surface-card p-3.5 text-center"
          >
            <div className={`text-lg font-bold ${color}`}>{val}</div>
            <div className="text-[10px] text-text-dim">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <SectionLabel>Recent Invoices</SectionLabel>
        {invoices.length > 0 ? (
          invoices.map((inv, i) => (
            <div
              key={inv.id}
              className={`flex items-center justify-between py-2 ${
                i < invoices.length - 1 ? "border-b border-border-light" : ""
              }`}
            >
              <span className="text-[13px] text-text-primary">
                {inv.period_label ?? formatDate(inv.created_at)}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] tabular-nums text-text-muted">
                  {formatCurrency(inv.amount)}
                </span>
                <ColoredBadge
                  color={inv.status === "paid" ? "emerald" : inv.status === "failed" ? "red" : "amber"}
                >
                  {inv.status}
                </ColoredBadge>
                {inv.invoice_url && (
                  <a
                    href={inv.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-text-dim hover:text-text-muted"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-[13px] text-text-dim">
            No invoices yet
          </div>
        )}
      </div>

      {/* Stripe portal link */}
      <div className="cursor-not-allowed rounded-xl border border-border-default bg-surface-card p-3.5 text-center opacity-50">
        <span className="text-[13px] text-text-muted">
          Open Stripe Billing Portal &rarr;
        </span>
        <div className="mt-0.5 text-[10px] text-text-dim">Coming soon</div>
      </div>
    </div>
  );
}
