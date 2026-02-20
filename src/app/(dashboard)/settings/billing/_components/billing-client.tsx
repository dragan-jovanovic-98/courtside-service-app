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

type PhoneNumber = {
  id: string;
  number: string;
  friendly_name: string | null;
  type: string | null;
  status: string;
  agent_id: string | null;
  total_texts_sent: number | null;
  total_calls_handled: number | null;
};

type Usage = {
  callMinutes: number;
  phoneNumberCount: number;
};

// Plan limits — these would come from Stripe metadata in production
const PLAN_LIMITS = {
  callMinutes: 1000,
  phoneNumbers: 5,
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

function formatPhone(e164: string): string {
  // +14165551234 → (416) 555-1234
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export function BillingClient({
  subscription,
  invoices,
  phoneNumbers,
  usage,
}: {
  subscription: Subscription;
  invoices: Invoice[];
  phoneNumbers: PhoneNumber[];
  usage: Usage;
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
            <span className="font-semibold text-text-primary">
              {usage.callMinutes} / {PLAN_LIMITS.callMinutes}
            </span>
          </div>
          <ProgressBar value={usage.callMinutes} max={PLAN_LIMITS.callMinutes} color={tokens.emerald} />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-text-dim">
            <span>Phone Numbers</span>
            <span className="font-semibold text-text-primary">
              {usage.phoneNumberCount} / {PLAN_LIMITS.phoneNumbers}
            </span>
          </div>
          <ProgressBar value={usage.phoneNumberCount} max={PLAN_LIMITS.phoneNumbers} color={tokens.blue} />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            [monthlyAmount, "Monthly Cost", "text-text-primary"],
            [`${usage.callMinutes} min`, "Minutes Used", "text-amber-light"],
            [`${usage.phoneNumberCount}`, "Phone Numbers", "text-emerald-light"],
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

      {/* Phone Numbers */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <SectionLabel>Phone Numbers</SectionLabel>
        {phoneNumbers.length > 0 ? (
          phoneNumbers.map((pn, i) => (
            <div
              key={pn.id}
              className={`flex items-center justify-between py-2 ${
                i < phoneNumbers.length - 1 ? "border-b border-border-light" : ""
              }`}
            >
              <div>
                <span className="text-[13px] font-medium text-text-primary">
                  {formatPhone(pn.number)}
                </span>
                {pn.friendly_name && (
                  <span className="ml-2 text-[11px] text-text-dim">
                    {pn.friendly_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <ColoredBadge color={pn.type === "inbound" ? "blue" : "purple"}>
                  {pn.type ?? "voice"}
                </ColoredBadge>
                <span className="text-[11px] tabular-nums text-text-dim">
                  {pn.total_calls_handled ?? 0} calls
                </span>
                <span className="text-[11px] tabular-nums text-text-dim">
                  {pn.total_texts_sent ?? 0} texts
                </span>
                <ColoredBadge color={pn.status === "active" ? "emerald" : "amber"}>
                  {pn.status}
                </ColoredBadge>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-[13px] text-text-dim">
            No phone numbers assigned yet
          </div>
        )}
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
