"use client";

import { useState } from "react";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/section-label";
import { tokens } from "@/lib/design-tokens";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  plan_name: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  price_monthly: number | null;
  call_minutes_limit: number | null;
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

const PLANS = [
  { tier: "starter", name: "Starter", price: 500, minutes: 750 },
  { tier: "professional", name: "Professional", price: 1000, minutes: 1500 },
  { tier: "enterprise", name: "Enterprise", price: 2500, minutes: 4000 },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(cents: number | null, symbol = "$"): string {
  if (cents == null) return "—";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

async function callEdgeFunction(slug: string, body: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${slug}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
    throw new Error(err.error || `Error ${res.status}`);
  }

  return res.json();
}

export function BillingClient({
  subscription,
  invoices,
  phoneNumbers,
  usage,
  hasStripeCustomer,
  country,
}: {
  subscription: Subscription;
  invoices: Invoice[];
  phoneNumbers: PhoneNumber[];
  usage: Usage;
  hasStripeCustomer: boolean;
  country: string;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const planName = subscription?.plan_name ?? "Free";
  const planStatus = subscription?.status ?? "none";
  const renewalDate = formatDate(subscription?.current_period_end ?? null);
  const monthlyAmount = subscription?.price_monthly
    ? formatCurrency(subscription.price_monthly)
    : "$0";
  const minutesLimit = subscription?.call_minutes_limit ?? 0;
  const currencySymbol = country === "CA" ? "CA$" : "$";
  const hasActiveSubscription = subscription && subscription.status !== "canceled";

  async function handleCheckout(tier: string) {
    setCheckoutLoading(tier);
    setCheckoutError(null);
    try {
      const { url } = await callEdgeFunction("create-checkout-session", {
        tier,
        return_url: window.location.href,
      });
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setCheckoutError(message);
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { url } = await callEdgeFunction("stripe-portal-url", {
        return_url: window.location.href,
      });
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setPortalError(message);
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-[520px]">
      {/* Plan selection — show when no active subscription */}
      {!hasActiveSubscription && (
        <div className="mb-4">
          <SectionLabel>Choose a Plan</SectionLabel>
          <div className="mt-2 space-y-2">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className="flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 transition-colors hover:border-emerald-light/30 hover:bg-surface-hover"
              >
                <div>
                  <div className="text-[14px] font-semibold text-text-primary">
                    {plan.name}
                  </div>
                  <div className="text-[12px] text-text-dim">
                    {plan.minutes.toLocaleString()} minutes/mo
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-text-primary">
                      {currencySymbol}{plan.price}
                    </div>
                    <div className="text-[10px] text-text-dim">/month</div>
                  </div>
                  <button
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={checkoutLoading !== null || !hasStripeCustomer}
                    className="rounded-lg bg-emerald-dark px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-dark/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkoutLoading === plan.tier ? "…" : "Subscribe"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {checkoutError && (
            <div className="mt-2 text-center text-[11px] text-red-light">{checkoutError}</div>
          )}
          {!hasStripeCustomer && (
            <div className="mt-2 text-center text-[11px] text-text-dim">
              Billing account is being set up. Please refresh in a moment.
            </div>
          )}
        </div>
      )}

      {/* Current plan card — show when subscribed */}
      {hasActiveSubscription && (
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
                {monthlyAmount}/mo &middot; Renews {renewalDate}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ColoredBadge color={planStatus === "active" ? "emerald" : "amber"}>
                {planStatus}
              </ColoredBadge>
            </div>
          </div>

          {minutesLimit > 0 && (
            <div className="mb-3.5">
              <div className="mb-1.5 flex justify-between text-xs text-text-dim">
                <span>AI Call Minutes</span>
                <span className="font-semibold text-text-primary">
                  {usage.callMinutes} / {minutesLimit.toLocaleString()}
                </span>
              </div>
              <ProgressBar value={usage.callMinutes} max={minutesLimit} color={tokens.emerald} />
            </div>
          )}
        </div>
      )}

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
      <button
        onClick={handlePortal}
        disabled={portalLoading || !hasStripeCustomer}
        className={`w-full rounded-xl border border-border-default bg-surface-card p-3.5 text-center transition-colors ${
          !hasStripeCustomer
            ? "cursor-not-allowed opacity-50"
            : "hover:border-emerald-light/30 hover:bg-surface-hover"
        }`}
      >
        <span className="text-[13px] text-text-muted">
          {portalLoading ? "Opening…" : "Manage Billing & Invoices →"}
        </span>
        {!hasStripeCustomer && (
          <div className="mt-0.5 text-[10px] text-text-dim">No billing account linked</div>
        )}
        {portalError && (
          <div className="mt-1 text-[11px] text-red-light">{portalError}</div>
        )}
      </button>
    </div>
  );
}
