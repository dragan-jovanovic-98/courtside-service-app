"use client";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { mockIntegrations } from "@/lib/mock-data";

export function IntegrationsClient() {
  return (
    <div className="max-w-[520px]">
      <SectionLabel>Connected Services</SectionLabel>

      {mockIntegrations.map((svc, i) => (
        <div
          key={i}
          className={`mb-2 flex items-center justify-between rounded-xl border border-border-default bg-surface-card p-4 ${
            svc.status === "soon" ? "opacity-55" : ""
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {svc.name}
              </span>
              {svc.status === "soon" && (
                <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold tracking-[0.05em] text-amber-light">
                  COMING SOON
                </span>
              )}
            </div>
            <div className="text-xs text-text-dim">{svc.description}</div>
          </div>
          {svc.status === "available" && (
            <Button
              variant="ghost"
              size="sm"
              className="border border-border-default bg-[rgba(255,255,255,0.03)] text-xs text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              Connect
            </Button>
          )}
        </div>
      ))}

      {/* Request card */}
      <div className="mt-3 rounded-xl border border-dashed border-border-default bg-surface-card p-5 text-center">
        <div className="text-[13px] text-text-muted">
          Need a different integration?
        </div>
        <div className="mt-0.5 text-xs text-text-dim">
          Contact us at integrations@courtside.com
        </div>
      </div>
    </div>
  );
}
