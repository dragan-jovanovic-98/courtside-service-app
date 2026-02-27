"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  Mail,
  User,
  Users,
  Search,
  Upload,
  Plus,
  MessageSquare,
  CalendarCheck,
  Check,
  XCircle,
  TrendingUp,
  X,
  FileSpreadsheet,
  ExternalLink,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  type BadgeColor,
  outcomeBadgeColor,
  leadBadgeColor,
} from "@/lib/design-tokens";
import { updateLeadStatus, fetchLeadCalls } from "@/lib/actions/leads";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import type { LeadListItem, TimelineEvent, LeadCallItem } from "@/types";

const STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Appt Set",
  "Showed",
  "Closed Won",
  "Closed Lost",
  "Bad Lead",
] as const;

const OUTCOMES = [
  "Booked",
  "Interested",
  "Callback",
  "Voicemail",
  "No Answer",
  "Not Interested",
  "Wrong Number",
  "DNC",
] as const;

const timelineIcon = (type: "call" | "sms" | "email") => {
  const map = {
    call: {
      icon: <Phone size={12} />,
      bg: "bg-emerald-bg-strong",
      text: "text-emerald-light",
    },
    sms: {
      icon: <MessageSquare size={12} />,
      bg: "bg-blue-bg",
      text: "text-blue-light",
    },
    email: {
      icon: <Mail size={12} />,
      bg: "bg-purple-bg",
      text: "text-purple-light",
    },
  };
  return map[type];
};

function statusBadgeColor(status: string): BadgeColor {
  return leadBadgeColor[status.toLowerCase().replace(/ /g, "_")] ?? "default";
}

function outcomeKey(outcome: string): string {
  return outcome.toLowerCase().replace(/ /g, "_");
}

// ---------------------------------------------------------------------------
// Import Leads Modal
// ---------------------------------------------------------------------------
function ImportModal({
  campaigns,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    if (f) {
      f.text().then((text) => {
        const lines = text.trim().split("\n");
        setRowCount(Math.max(0, lines.length - 1)); // minus header
      });
    } else {
      setRowCount(0);
    }
  };

  const handleImport = async () => {
    if (!campaignId) {
      setError("Select a campaign");
      return;
    }
    if (!file) {
      setError("Select a CSV file");
      return;
    }
    setLoading(true);
    setError(null);

    const csvText = await file.text();
    const { data, error: err } = await callEdgeFunction<{
      imported: number;
      duplicates: number;
      dnc_excluded: number;
    }>("import-leads", {
      campaign_id: campaignId,
      csv: csvText,
    });

    setLoading(false);
    if (err) {
      setError(err);
    } else {
      const msg = data
        ? `Imported ${data.imported} leads (${data.duplicates} duplicates, ${data.dnc_excluded} DNC excluded)`
        : "Import complete";
      alert(msg);
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-[#141820] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Import Leads</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text-muted">Campaign</Label>
            {campaigns.length === 0 ? (
              <p className="text-sm text-red-light">
                No campaigns found. Create a campaign first.
              </p>
            ) : (
              <select
                className="w-full appearance-none rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary outline-none"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-text-muted">CSV File</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border-default bg-surface-card p-6 text-center hover:border-emerald-dark transition-colors"
            >
              <FileSpreadsheet size={28} className="text-text-dim" />
              {file ? (
                <>
                  <span className="text-sm font-medium text-text-primary">{file.name}</span>
                  <span className="text-xs text-text-dim">{rowCount} rows</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-text-muted">Click to select a CSV file</span>
                  <span className="text-xs text-text-dim">
                    Columns: first_name, last_name, phone, email, company, source
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && <p className="text-sm text-red-light">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
              onClick={handleImport}
              disabled={loading || !campaignId || !file}
            >
              {loading ? "Importing…" : (
                <>
                  <Upload size={14} /> Import {rowCount > 0 && `(${rowCount})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Lead Modal
// ---------------------------------------------------------------------------
function AddLeadModal({
  campaigns,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!campaignId) {
      setError("Select a campaign");
      return;
    }
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return;
    }
    setLoading(true);
    setError(null);

    // Build a 1-row CSV and use the existing import-leads edge function
    const header = "first_name,last_name,phone,email,company,source";
    const escape = (v: string) => v.replace(/,/g, "").replace(/\n/g, "");
    const row = [
      escape(firstName),
      escape(lastName),
      escape(phone),
      escape(email),
      escape(company),
      "manual",
    ].join(",");

    const { error: err } = await callEdgeFunction("import-leads", {
      campaign_id: campaignId,
      csv: `${header}\n${row}`,
    });

    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-[#141820] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Add Lead</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-text-muted">Campaign</Label>
            {campaigns.length === 0 ? (
              <p className="text-sm text-red-light">
                No campaigns found. Create a campaign first.
              </p>
            ) : (
              <select
                className="w-full appearance-none rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary outline-none"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-text-muted">First name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-text-muted">Last name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted">Phone *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555-123-4567"
              className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-text-muted">Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
            />
          </div>

          {error && <p className="text-sm text-red-light">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
              onClick={handleAdd}
              disabled={loading || !campaignId}
            >
              {loading ? "Adding…" : (
                <>
                  <Plus size={14} /> Add Lead
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRM Import Modal
// ---------------------------------------------------------------------------
function CrmImportModal({
  campaigns,
  onClose,
  onSuccess,
}: {
  campaigns: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);

  const handleImport = async () => {
    if (!campaignId) {
      setError("Select a campaign");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: err } = await callEdgeFunction<{
      imported: number;
      duplicates: number;
    }>("crm-import-contacts", {
      campaign_id: campaignId,
      preview_only: false,
    });

    setLoading(false);
    if (err) {
      setError(err);
    } else if (data) {
      setResult(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-[#141820] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Import from CRM</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[rgba(52,211,153,0.3)] bg-emerald-bg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-light">{result.imported}</div>
              <div className="text-sm text-text-muted">contacts imported</div>
              {result.duplicates > 0 && (
                <div className="mt-1 text-xs text-text-dim">{result.duplicates} duplicates skipped</div>
              )}
            </div>
            <Button
              className="w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
              onClick={onSuccess}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-default bg-surface-card p-4 text-center">
              <Database size={28} className="mx-auto mb-2 text-blue-light" />
              <div className="text-sm font-medium text-text-primary">HubSpot Import</div>
              <div className="mt-1 text-xs text-text-dim">
                Import all contacts from your connected HubSpot account
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-text-muted">Add to Campaign</Label>
              {campaigns.length === 0 ? (
                <p className="text-sm text-red-light">
                  No campaigns found. Create a campaign first.
                </p>
              ) : (
                <select
                  className="w-full appearance-none rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary outline-none"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && <p className="text-sm text-red-light">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
                onClick={handleImport}
                disabled={loading || !campaignId}
              >
                {loading ? "Importing…" : (
                  <>
                    <Database size={14} /> Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const SOURCES = ["CSV Import", "CRM Import", "Manual", "Inbound"] as const;

function sourceLabel(source: string | null): string {
  if (!source) return "CSV";
  switch (source) {
    case "csv": return "CSV";
    case "crm_import": return "CRM";
    case "manual": return "Manual";
    case "inbound": return "Inbound";
    default: return source;
  }
}

function sourceBadgeColor(source: string | null): BadgeColor {
  if (!source) return "default";
  switch (source) {
    case "crm_import": return "blue";
    case "manual": return "purple";
    case "inbound": return "amber";
    default: return "default";
  }
}

export function LeadsClient({
  leads,
  stats,
  campaigns,
  hasCrm = false,
  initialDetailId = null,
}: {
  leads: LeadListItem[];
  stats: { total: number; followUps: number; appointments: number; new: number };
  campaigns: { id: string; name: string }[];
  hasCrm?: boolean;
  initialDetailId?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);
  const [timeline] = useState<TimelineEvent[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showCrmImport, setShowCrmImport] = useState(false);
  const [leadCalls, setLeadCalls] = useState<LeadCallItem[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  const filtered = leads.filter((l) => {
    const matchesSearch =
      !query ||
      (l.name + l.phone + (l.email ?? "") + (l.company ?? ""))
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      l.status.toLowerCase().replace(/ /g, "_") ===
        statusFilter.toLowerCase().replace(/ /g, "_");
    const matchesOutcome =
      outcomeFilter === "all" ||
      (l.outcome &&
        outcomeKey(l.outcome) === outcomeKey(outcomeFilter));
    const matchesSource =
      sourceFilter === "all" ||
      sourceLabel(l.source).toLowerCase() === sourceFilter.toLowerCase().replace(/ import/g, "");
    return matchesSearch && matchesStatus && matchesOutcome && matchesSource;
  });

  const handleModalSuccess = () => {
    setShowImport(false);
    setShowAdd(false);
    setShowCrmImport(false);
    router.refresh();
  };

  // Fetch calls when detail view opens
  useEffect(() => {
    if (!detailId) {
      setLeadCalls([]);
      return;
    }
    setLoadingCalls(true);
    fetchLeadCalls(detailId).then((calls) => {
      setLeadCalls(calls);
      setLoadingCalls(false);
    });
  }, [detailId]);

  // Detail View
  if (detailId) {
    const lead = leads.find((l) => l.id === detailId);
    if (!lead) {
      setDetailId(null);
      return null;
    }

    const handleStatusChange = async (newStatus: string) => {
      await updateLeadStatus(lead.id, newStatus.toLowerCase().replace(/ /g, "_"));
    };

    return (
      <div>
        <div className="mb-6 flex items-center gap-2.5">
          <button
            onClick={() => setDetailId(null)}
            className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1.5 text-text-muted hover:text-text-primary"
          >
            <ChevronLeft size={16} />
          </button>
          <h1 className="text-[22px] font-bold text-text-primary">
            {lead.name}
          </h1>
          {lead.outcome && (
            <ColoredBadge
              color={outcomeBadgeColor[outcomeKey(lead.outcome)] ?? "default"}
            >
              {lead.outcome}
            </ColoredBadge>
          )}
          {lead.source && (
            <ColoredBadge color={sourceBadgeColor(lead.source)}>
              {sourceLabel(lead.source)}
            </ColoredBadge>
          )}
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-5">
          {/* Left column */}
          <div>
            {/* Contact card */}
            <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-5">
              <SectionLabel>Contact</SectionLabel>
              {(
                [
                  [<Phone size={13} key="p" />, lead.phone],
                  [<Mail size={13} key="m" />, lead.email ?? "—"],
                  [<User size={13} key="u" />, lead.company ?? "—"],
                ] as const
              ).map(([icon, val], i) => (
                <div
                  key={i}
                  className="mb-2 flex items-center gap-2 text-[13px] text-text-primary"
                >
                  {icon} {val}
                </div>
              ))}
              {lead.crmRecordId && lead.crmProvider === "hubspot" && (
                <a
                  href={`https://app.hubspot.com/contacts/${lead.crmRecordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-blue-light hover:underline"
                >
                  <ExternalLink size={12} /> View in HubSpot
                </a>
              )}
            </div>

            {/* Status management */}
            <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-4">
              <SectionLabel>Lead Status</SectionLabel>
              <div className="mb-2.5 flex items-center gap-2">
                <ColoredBadge color={statusBadgeColor(lead.status)}>
                  {lead.status}
                </ColoredBadge>
              </div>

              {lead.status === "interested" && (
                <Button
                  onClick={() => handleStatusChange("appt_set")}
                  className="mb-2 w-full justify-center gap-1.5 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                >
                  <CalendarCheck size={12} /> Mark as Booked
                </Button>
              )}
              {lead.status === "appt_set" && (
                <Button
                  onClick={() => handleStatusChange("showed")}
                  className="mb-2 w-full justify-center gap-1.5 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                >
                  <Check size={12} /> Mark as Showed
                </Button>
              )}
              {lead.status === "showed" && (
                <div className="mb-2 flex flex-col gap-1.5">
                  <Button
                    onClick={() => handleStatusChange("closed_won")}
                    className="w-full justify-center gap-1 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                  >
                    <Check size={12} /> Closed Won
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("closed_lost")}
                    className="w-full justify-center gap-1 border border-border-default bg-surface-card text-xs text-red-light hover:bg-surface-card-hover"
                  >
                    <XCircle size={12} /> Closed Lost
                  </Button>
                </div>
              )}
              {lead.status === "contacted" && (
                <Button
                  onClick={() => handleStatusChange("interested")}
                  className="mb-2 w-full justify-center gap-1.5 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                >
                  <TrendingUp size={12} /> Mark Interested
                </Button>
              )}

              <select
                className="w-full appearance-none rounded-lg border border-border-default bg-surface-input px-2.5 py-2 text-xs text-text-muted outline-none"
                defaultValue={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {[...STATUSES].map((s) => (
                  <option
                    key={s}
                    value={s.toLowerCase().replace(/ /g, "_")}
                  >
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5">
              <Button
                disabled
                className="justify-center gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
              >
                <Phone size={13} /> Call Now
                <span className="ml-auto text-[10px] opacity-50">Soon</span>
              </Button>
              <Button variant="ghost" disabled className="justify-center gap-1.5">
                <MessageSquare size={13} /> Text
                <span className="ml-auto text-[10px] opacity-50">Soon</span>
              </Button>
              <Button variant="ghost" disabled className="justify-center gap-1.5">
                <Mail size={13} /> Email
                <span className="ml-auto text-[10px] opacity-50">Soon</span>
              </Button>
            </div>
          </div>

          {/* Right column — Calls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border-default bg-surface-card p-5">
              <SectionLabel>Calls</SectionLabel>
              {loadingCalls ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-lg bg-[rgba(255,255,255,0.03)]"
                    />
                  ))}
                </div>
              ) : leadCalls.length > 0 ? (
                <div className="space-y-1.5">
                  {leadCalls.map((call) => (
                    <Link
                      key={call.id}
                      href={`/calls?id=${call.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border-light bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-bg-strong text-emerald-light">
                        <Phone size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-text-primary">
                            {call.duration}
                          </span>
                          <ColoredBadge
                            color={
                              outcomeBadgeColor[outcomeKey(call.outcome)] ??
                              "default"
                            }
                          >
                            {call.outcome}
                          </ColoredBadge>
                        </div>
                        {call.aiSummary && (
                          <p className="mt-0.5 truncate text-[11px] text-text-dim">
                            {call.aiSummary}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-text-dim">
                        {call.date}
                        <ExternalLink size={10} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-text-dim">
                  No calls yet
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-border-default bg-surface-card p-5">
              <SectionLabel>Timeline</SectionLabel>
              {timeline.length > 0 ? (
                timeline.map((t, i) => {
                  const iconData = timelineIcon(t.type);
                  return (
                    <div
                      key={i}
                      className="flex gap-3"
                      style={{
                        marginBottom: i < timeline.length - 1 ? 16 : 0,
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full",
                            iconData.bg,
                            iconData.text
                          )}
                        >
                          {iconData.icon}
                        </div>
                        {i < timeline.length - 1 && (
                          <div className="mt-1 flex-1 border-l border-border-default" />
                        )}
                      </div>
                      <div className="pb-1">
                        <div className="text-[11px] text-text-dim">
                          {t.time}
                        </div>
                        <div className="mt-0.5 text-[13px] font-semibold text-text-primary">
                          {t.title}
                        </div>
                        <div className="mt-0.5 text-xs text-text-dim">
                          {t.detail}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[13px] text-text-dim">
                  No activity yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      {/* Modals */}
      {showImport && (
        <ImportModal
          campaigns={campaigns}
          onClose={() => setShowImport(false)}
          onSuccess={handleModalSuccess}
        />
      )}
      {showAdd && (
        <AddLeadModal
          campaigns={campaigns}
          onClose={() => setShowAdd(false)}
          onSuccess={handleModalSuccess}
        />
      )}
      {showCrmImport && (
        <CrmImportModal
          campaigns={campaigns}
          onClose={() => setShowCrmImport(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <div className="flex gap-2">
          <Button variant="ghost" className="gap-1.5" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import CSV
          </Button>
          {hasCrm && (
            <Button variant="ghost" className="gap-1.5" onClick={() => setShowCrmImport(true)}>
              <Database size={14} /> Import CRM
            </Button>
          )}
          <Button
            className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(
          [
            ["Total", stats.total, "text-text-primary"],
            ["Follow-ups", stats.followUps, "text-amber-light"],
            ["Appointments", stats.appointments, "text-emerald-light"],
            ["New", stats.new, "text-blue-light"],
          ] as const
        ).map(([label, val, color]) => (
          <div
            key={label}
            className="rounded-xl border border-border-default bg-surface-card px-4 py-2.5 text-center"
          >
            <div className={`text-lg font-bold tabular-nums ${color}`}>
              {val}
            </div>
            <div className="text-[10px] text-text-dim">{label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email..."
            className="border-border-default bg-surface-input pl-[34px] text-text-primary placeholder:text-text-dim"
          />
        </div>
        <DropdownSelect
          label="Status"
          value={statusFilter}
          options={[...STATUSES]}
          onChange={setStatusFilter}
        />
        <DropdownSelect
          label="Outcome"
          value={outcomeFilter}
          options={[...OUTCOMES]}
          onChange={setOutcomeFilter}
        />
        <DropdownSelect
          label="Source"
          value={sourceFilter}
          options={[...SOURCES]}
          onChange={setSourceFilter}
        />
      </div>

      {/* Leads table */}
      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Import your first leads to start building your pipeline."
          action={
            <Button
              className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
              onClick={() => setShowImport(true)}
            >
              <Upload size={14} /> Import your first leads
            </Button>
          }
        />
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              {["Name", "Phone", "Status", "Outcome", "Source", "Last", "Campaign"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((l, i) => (
                <tr
                  key={l.id}
                  onClick={() => setDetailId(l.id)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                    i < filtered.length - 1 && "border-b border-border-light"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="text-[13px] font-semibold text-text-primary">
                      {l.name}
                    </div>
                    <div className="text-[11px] text-text-dim">
                      {l.company}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] tabular-nums text-text-muted">
                    {l.phone}
                  </td>
                  <td className="px-4 py-2.5">
                    <ColoredBadge color={statusBadgeColor(l.status)}>
                      {l.status}
                    </ColoredBadge>
                  </td>
                  <td className="px-4 py-2.5">
                    {l.outcome ? (
                      <ColoredBadge
                        color={
                          outcomeBadgeColor[outcomeKey(l.outcome)] ?? "default"
                        }
                      >
                        {l.outcome}
                      </ColoredBadge>
                    ) : (
                      <span className="text-xs text-text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <ColoredBadge color={sourceBadgeColor(l.source)}>
                      {sourceLabel(l.source)}
                    </ColoredBadge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-dim">
                    {l.lastActivity}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-dim">
                    {l.campaign}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-[13px] text-text-dim"
                >
                  No leads match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
