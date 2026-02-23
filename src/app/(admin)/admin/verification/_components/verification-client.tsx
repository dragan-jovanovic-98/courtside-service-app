"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { approveVerification, rejectVerification } from "@/lib/actions/admin";

type VerificationRow = {
  id: string;
  org_id: string;
  status: string;
  business_name: string | null;
  business_type: string | null;
  tax_id: string | null;
  state_registration_number: string | null;
  rep_name: string | null;
  rep_title: string | null;
  rep_email: string | null;
  rep_phone: string | null;
  business_address: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  orgName: string;
};

const tabs = [
  { label: "All", value: "all" },
  { label: "Pending", value: "in_progress" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Approved" },
  in_progress: { bg: "bg-amber-400/10", text: "text-amber-400", label: "In Progress" },
  rejected: { bg: "bg-red-400/10", text: "text-red-400", label: "Rejected" },
  not_started: { bg: "bg-white/5", text: "text-text-dim", label: "Not Started" },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? statusConfig.not_started;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
        {label}
      </span>
      <p className="mt-0.5 text-sm text-text-primary">{value || "—"}</p>
    </div>
  );
}

export function VerificationClient({
  verifications,
}: {
  verifications: VerificationRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  const filtered = verifications.filter(
    (v) => currentStatus === "all" || v.status === currentStatus
  );

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/admin/verification?${params.toString()}`);
  }

  function handleApprove(id: string) {
    setActionId(id);
    startTransition(async () => {
      const result = await approveVerification(id);
      if (result.error) alert(`Error: ${result.error}`);
      setActionId(null);
    });
  }

  function handleReject(id: string) {
    if (!confirm("Reject this verification?")) return;
    setActionId(id);
    startTransition(async () => {
      const result = await rejectVerification(id);
      if (result.error) alert(`Error: ${result.error}`);
      setActionId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Verification</h1>
        <span className="text-sm text-text-dim">{filtered.length} total</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-amber-400/15 text-amber-400"
                : "text-text-dim hover:text-text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Verification Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-surface-card px-4 py-12 text-center">
          <ShieldCheck size={24} className="mx-auto mb-2 text-text-dim" />
          <p className="text-sm text-text-dim">No verifications found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-border-default bg-surface-card p-5"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{v.orgName}</h3>
                  {v.submitted_at && (
                    <p className="mt-0.5 text-xs text-text-dim">
                      Submitted {new Date(v.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={v.status} />
                  {v.status === "in_progress" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(v.id)}
                        disabled={isPending && actionId === v.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isPending && actionId === v.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(v.id)}
                        disabled={isPending && actionId === v.id}
                        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                      >
                        {isPending && actionId === v.id ? "..." : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                <DetailRow label="Business Name" value={v.business_name} />
                <DetailRow label="Business Type" value={v.business_type} />
                <DetailRow label="Tax ID" value={v.tax_id} />
                <DetailRow label="State Reg #" value={v.state_registration_number} />
                <DetailRow label="Rep Name" value={v.rep_name} />
                <DetailRow label="Rep Title" value={v.rep_title} />
                <DetailRow label="Rep Email" value={v.rep_email} />
                <DetailRow label="Rep Phone" value={v.rep_phone} />
                <DetailRow label="Business Address" value={v.business_address} />
                {v.reviewed_at && (
                  <DetailRow
                    label="Reviewed At"
                    value={new Date(v.reviewed_at).toLocaleString()}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
