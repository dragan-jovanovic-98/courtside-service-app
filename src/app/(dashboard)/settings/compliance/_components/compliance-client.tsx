"use client";

import { useState } from "react";
import { Check, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsToggle } from "@/components/ui/settings-toggle";
import { mockComplianceStats } from "@/lib/mock-data";

export function ComplianceClient() {
  const [casl, setCasl] = useState(true);
  const [smsStop, setSmsStop] = useState(true);
  const [verbalDnc, setVerbalDnc] = useState(true);
  const [emailUnsub, setEmailUnsub] = useState(true);
  const [dncRegistry, setDncRegistry] = useState(true);

  return (
    <div className="max-w-[540px]">
      {/* Compliance status banner */}
      <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(52,211,153,0.15)] bg-emerald-bg px-[18px] py-3.5">
        <Check size={16} className="shrink-0 text-emerald-light" />
        <div>
          <div className="text-[13px] font-semibold text-emerald-light">
            Compliant
          </div>
          <div className="text-[11px] text-text-dim">
            All compliance requirements met &middot; Last reviewed{" "}
            {mockComplianceStats.lastReviewed}
          </div>
        </div>
      </div>

      {/* Terms of Service */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 text-sm font-semibold text-text-primary">
              Terms of Service
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-light">
              <Check size={12} /> Accepted {mockComplianceStats.tosAcceptedDate}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            View Terms
          </Button>
        </div>
      </div>

      {/* Regulatory Compliance */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <div className="mb-3 text-sm font-semibold text-text-primary">
          Regulatory Compliance
        </div>
        <SettingsToggle
          label="CASL Compliance"
          subtitle="Canadian Anti-Spam Legislation compliance for messages"
          enabled={casl}
          onChange={setCasl}
        />
        <div className="mt-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] px-3.5 py-2.5">
          <div className="mb-1 text-xs text-text-muted">
            By using Courtside AI, you confirm that:
          </div>
          <div className="flex flex-col gap-1">
            {[
              "You have consent to contact the leads in your campaigns",
              "Your business complies with local and federal telemarketing laws",
              "You will not use the platform for fraudulent or deceptive purposes",
            ].map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-text-dim"
              >
                <Check
                  size={10}
                  className="mt-0.5 shrink-0 text-emerald-light"
                />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DNC Management */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="mb-0.5 text-sm font-semibold text-text-primary">
              Do Not Call (DNC) List
            </div>
            <div className="text-xs text-text-dim">
              Numbers that will never be called by any campaign.
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Upload size={11} /> Upload CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Plus size={11} /> Add
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              [mockComplianceStats.dncCount, "Numbers Blocked"],
              [mockComplianceStats.dncLastUpdated, "Last Updated"],
              [mockComplianceStats.dncAutoAdded, "Auto-Added"],
            ] as const
          ).map(([val, label]) => (
            <div
              key={label}
              className="rounded-lg bg-[rgba(255,255,255,0.02)] px-2.5 py-2 text-center"
            >
              <div className="text-[15px] font-bold text-text-primary">
                {val}
              </div>
              <div className="text-[9px] text-text-dim">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto Opt-Out Rules */}
      <div className="rounded-xl border border-border-default bg-surface-card p-5">
        <div className="mb-3 text-sm font-semibold text-text-primary">
          Auto Opt-Out Rules
        </div>
        <SettingsToggle
          label='SMS "STOP" → Remove from all campaigns'
          subtitle="Instant removal when keyword detected"
          enabled={smsStop}
          onChange={setSmsStop}
        />
        <SettingsToggle
          label="Verbal DNC → Auto-flag on calls"
          subtitle="AI detects do-not-call requests during conversation"
          enabled={verbalDnc}
          onChange={setVerbalDnc}
        />
        <SettingsToggle
          label="Email Unsubscribe → Remove from sequences"
          subtitle="Honors unsubscribe links automatically"
          enabled={emailUnsub}
          onChange={setEmailUnsub}
        />
        <SettingsToggle
          label="National DNC Registry Check"
          subtitle="Cross-reference with Canadian DNCL before calling"
          enabled={dncRegistry}
          onChange={setDncRegistry}
        />
      </div>
    </div>
  );
}
