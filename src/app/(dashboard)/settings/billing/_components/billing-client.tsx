"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/section-label";
import { tokens } from "@/lib/design-tokens";
import {
  mockSubscription,
  mockInvoices,
  mockPhoneNumbers,
} from "@/lib/mock-data";

export function BillingClient() {
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
              {mockSubscription.plan}
            </div>
            <div className="mt-0.5 text-xs text-text-dim">
              {mockSubscription.price} &middot; Renews{" "}
              {mockSubscription.renewalDate}
            </div>
          </div>
          <Button className="bg-emerald-dark text-white hover:bg-emerald-dark/90">
            Upgrade
          </Button>
        </div>

        <div className="mb-3.5">
          <div className="mb-1.5 flex justify-between text-xs text-text-dim">
            <span>AI Call Minutes</span>
            <span className="font-semibold text-text-primary">
              {mockSubscription.minutesUsed.toLocaleString()} /{" "}
              {mockSubscription.minutesTotal.toLocaleString()}
            </span>
          </div>
          <ProgressBar
            value={mockSubscription.minutesUsed}
            max={mockSubscription.minutesTotal}
            color={tokens.emerald}
          />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-text-dim">
            <span>Phone Numbers</span>
            <span className="font-semibold text-text-primary">
              {mockSubscription.phoneNumbersUsed} /{" "}
              {mockSubscription.phoneNumbersTotal}
            </span>
          </div>
          <ProgressBar
            value={mockSubscription.phoneNumbersUsed}
            max={mockSubscription.phoneNumbersTotal}
            color={tokens.blue}
          />
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["$299", "Monthly Cost", "text-text-primary"],
            ["$0.06", "Per Extra Min", "text-amber-light"],
            ["$2,153", "Saved vs. Manual", "text-emerald-light"],
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
        {mockInvoices.map((inv, i) => (
          <div
            key={inv.date}
            className={`flex items-center justify-between py-2 ${
              i < mockInvoices.length - 1
                ? "border-b border-border-light"
                : ""
            }`}
          >
            <span className="text-[13px] text-text-primary">{inv.date}</span>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] tabular-nums text-text-muted">
                {inv.amount}
              </span>
              <ColoredBadge color="emerald">{inv.status}</ColoredBadge>
            </div>
          </div>
        ))}
      </div>

      {/* Phone Numbers */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel className="mb-0">Your Phone Numbers</SectionLabel>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            <Plus size={11} /> Request Number
          </Button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              {["Number", "Type", "Assigned To", "Texts", "Calls", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {mockPhoneNumbers.map((ph, i) => (
              <tr
                key={ph.number}
                className={
                  i < mockPhoneNumbers.length - 1
                    ? "border-b border-border-light"
                    : ""
                }
              >
                <td className="py-2 text-[13px] font-semibold tabular-nums text-text-primary">
                  {ph.number}
                </td>
                <td className="py-2">
                  <ColoredBadge
                    color={ph.type === "Inbound" ? "blue" : "default"}
                  >
                    {ph.type}
                  </ColoredBadge>
                </td>
                <td className="py-2 text-xs text-text-muted">
                  {ph.assignedTo}
                </td>
                <td className="py-2 text-xs tabular-nums text-text-muted">
                  {ph.texts}
                </td>
                <td className="py-2 text-xs tabular-nums text-text-muted">
                  {ph.calls}
                </td>
                <td className="py-2">
                  <ColoredBadge color="emerald">{ph.status}</ColoredBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stripe portal link */}
      <div className="cursor-pointer rounded-xl border border-border-default bg-surface-card p-3.5 text-center transition-colors hover:bg-surface-card-hover">
        <span className="text-[13px] text-text-muted">
          Open Stripe Billing Portal &rarr;
        </span>
      </div>
    </div>
  );
}
