"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pause, Play, Megaphone, Trash2, Archive, X, Upload, UserPlus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import { addLeadsFromContacts } from "@/lib/actions/leads";
import { CampaignEditModal } from "./campaign-edit-modal";
import type { CampaignWithAgent, ContactForSelection } from "@/types";

type AgentOption = { id: string; name: string };
type CalendarOption = { id: string; label: string };

const statusFilters = ["all", "active", "paused", "draft", "completed", "archived"] as const;

export function CampaignsClient({
  campaigns,
  isVerified = false,
  agents = [],
  calendarOptions = [],
  contacts = [],
}: {
  campaigns: CampaignWithAgent[];
  isVerified?: boolean;
  agents?: AgentOption[];
  calendarOptions?: CalendarOption[];
  contacts?: ContactForSelection[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);
  const [addLeadsCampaignId, setAddLeadsCampaignId] = useState<string | null>(null);

  const editCampaign = campaigns.find((c) => c.id === editCampaignId) ?? null;

  // "All" tab excludes archived campaigns
  const nonArchived = campaigns.filter((c) => c.status !== "archived");
  const list =
    filter === "all"
      ? nonArchived
      : campaigns.filter((c) => c.status === filter);

  // Stats exclude archived
  const totalBookings = nonArchived.reduce((s, c) => s + c.bookings, 0);
  const totalLeads = nonArchived.reduce((s, c) => s + c.total_leads, 0);

  const handleStatusChange = async (campaignId: string, status: "active" | "paused" | "archived") => {
    setBusyIds((prev) => new Set(prev).add(campaignId));
    const { error } = await callEdgeFunction("update-campaign-status", {
      campaign_id: campaignId,
      status,
    });
    if (error) {
      const label = status === "active" ? "resume" : status === "paused" ? "pause" : "archive";
      alert(`Failed to ${label} campaign: ${error}`);
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(campaignId);
      return next;
    });
    router.refresh();
  };

  const handleDelete = async (campaignId: string) => {
    setBusyIds((prev) => new Set(prev).add(campaignId));
    const { error } = await callEdgeFunction("delete-campaign", {
      campaign_id: campaignId,
    });
    if (error) {
      alert(`Failed to delete campaign: ${error}`);
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(campaignId);
      return next;
    });
    router.refresh();
  };

  const handleAddLeadsSuccess = () => {
    setAddLeadsCampaignId(null);
    router.refresh();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Campaigns</h1>
        <Button
          asChild
          className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          <Link href="/campaigns/new">
            <Plus size={15} /> New Campaign
          </Link>
        </Button>
      </div>

      {/* Stats (exclude archived) */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(
          [
            [nonArchived.length, "Total", "text-text-primary"],
            [
              nonArchived.filter((c) => c.status === "active").length,
              "Active",
              "text-emerald-light",
            ],
            [totalLeads, "Total Leads", "text-blue-light"],
            [totalBookings, "Bookings", "text-amber-light"],
          ] as const
        ).map(([val, label, color]) => (
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

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-1">
        {statusFilters.map((x) => (
          <button
            key={x}
            onClick={() => setFilter(x)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
              filter === x
                ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                : "bg-[rgba(255,255,255,0.03)] text-text-dim hover:text-text-muted"
            )}
          >
            {x}
          </button>
        ))}
      </div>

      {/* Campaign cards */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to start reaching leads with AI-powered calls."
          action={
            <Button asChild className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
              <Link href="/campaigns/new">
                <Plus size={15} /> New Campaign
              </Link>
            </Button>
          }
        />
      ) : (
      <div className="flex flex-col gap-2.5">
        {list.length > 0 ? (
          list.map((c) => {
            const agentName = c.agents?.name ?? "Unassigned";
            const remaining = Math.max(0, c.total_leads - c.calls_made);
            const connectRate =
              c.calls_made > 0
                ? Math.round((c.calls_connected / c.calls_made) * 100) + "%"
                : "—";
            const isBusy = busyIds.has(c.id);
            const isArchived = c.status === "archived";
            const canDelete = c.status === "draft" && c.calls_made === 0;
            const canArchive = c.status === "paused" || c.status === "completed";

            return (
              <div
                key={c.id}
                onClick={() => setEditCampaignId(c.id)}
                className={cn(
                  "cursor-pointer rounded-xl border border-border-default bg-surface-card p-4 transition-all hover:bg-surface-card-hover",
                  isArchived && "opacity-50"
                )}
              >
                {/* Top row */}
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {c.name}
                    </span>
                    <ColoredBadge
                      color={
                        c.status === "active"
                          ? "emerald"
                          : c.status === "paused"
                          ? "amber"
                          : c.status === "completed"
                          ? "blue"
                          : c.status === "archived"
                          ? "default"
                          : "default"
                      }
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </ColoredBadge>
                  </div>
                  {!isArchived && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 px-2 text-[10px]"
                        disabled={isBusy}
                        onClick={() => setAddLeadsCampaignId(c.id)}
                      >
                        <Plus size={12} /> Leads
                      </Button>
                      {c.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(c.id, "paused")}
                        >
                          <Pause size={12} />
                        </Button>
                      )}
                      {c.status === "paused" && (
                        <Button
                          size="sm"
                          className="bg-emerald-dark px-2 text-white hover:bg-emerald-dark/90"
                          disabled={isBusy || !isVerified}
                          title={!isVerified ? "Complete verification to activate campaigns" : undefined}
                          onClick={() => handleStatusChange(c.id, "active")}
                        >
                          <Play size={12} />
                        </Button>
                      )}

                      {/* Archive button for paused/completed */}
                      {canArchive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 text-text-dim hover:text-text-muted"
                              disabled={isBusy}
                            >
                              <Archive size={12} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-border-default bg-[#141820]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-text-primary">
                                Archive Campaign
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-text-muted">
                                &ldquo;{c.name}&rdquo; will be hidden from your main campaign list.
                                You can still view it under the &ldquo;Archived&rdquo; filter. All
                                call history and lead data will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border-default bg-transparent text-text-muted hover:bg-surface-card-hover hover:text-text-primary">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-[rgba(255,255,255,0.1)] text-text-primary hover:bg-[rgba(255,255,255,0.15)]"
                                onClick={() => handleStatusChange(c.id, "archived")}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Delete button for draft campaigns with 0 calls */}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 text-red-light/70 hover:text-red-light"
                              disabled={isBusy}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-border-default bg-[#141820]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-text-primary">
                                Delete Campaign
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-text-muted">
                                This will permanently delete &ldquo;{c.name}&rdquo; and all its
                                leads. Contacts will not be deleted. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border-default bg-transparent text-text-muted hover:bg-surface-card-hover hover:text-text-primary">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-light/20 text-red-light hover:bg-red-light/30"
                                onClick={() => handleDelete(c.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-2.5 text-[11px] text-text-dim">
                  Agent: {agentName}
                </div>

                {c.total_leads > 0 ? (
                  <>
                    {/* Progress */}
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar
                          value={c.calls_made}
                          max={c.total_leads}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-text-muted">
                        {c.calls_made}/{c.total_leads} called ·{" "}
                        {Math.round((c.calls_made / c.total_leads) * 100)}%
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-[rgba(52,211,153,0.12)] bg-emerald-bg px-3.5 py-2 text-center">
                        <div className="text-2xl font-extrabold leading-none tabular-nums text-emerald-light">
                          {c.bookings}
                        </div>
                        <div className="mt-0.5 text-[9px] font-semibold text-emerald-light opacity-70">
                          BOOKED
                        </div>
                      </div>
                      <div className="grid flex-1 grid-cols-3 gap-3.5">
                        {(
                          [
                            [c.calls_connected, "Connected", connectRate],
                            [
                              c.total_duration_minutes + "m",
                              "Duration",
                              null,
                            ],
                            [remaining, "Remaining", null],
                          ] as const
                        ).map(([val, label, sub]) => (
                          <div key={label}>
                            <div className="text-[15px] font-bold tabular-nums text-text-primary">
                              {val}
                            </div>
                            <div className="text-[9px] text-text-dim">
                              {label}
                              {sub && (
                                <span className="ml-1 text-emerald-light opacity-70">
                                  {sub}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs italic text-text-faint">
                    No leads assigned yet
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-border-default bg-surface-card px-5 py-8 text-center text-[13px] text-text-dim">
            No campaigns match this filter
          </div>
        )}
      </div>
      )}

      {/* Edit / Detail Modal */}
      {editCampaign && (
        <CampaignEditModal
          campaign={editCampaign}
          agents={agents}
          calendarOptions={calendarOptions}
          open={!!editCampaignId}
          onOpenChange={(open) => {
            if (!open) setEditCampaignId(null);
          }}
        />
      )}

      {/* Add Leads Modal */}
      {addLeadsCampaignId && (
        <AddLeadsModal
          campaignId={addLeadsCampaignId}
          campaignName={campaigns.find((c) => c.id === addLeadsCampaignId)?.name ?? "Campaign"}
          contacts={contacts}
          onClose={() => setAddLeadsCampaignId(null)}
          onSuccess={handleAddLeadsSuccess}
        />
      )}
    </div>
  );
}

/* ─── Add Leads Modal ───────────────────────────────────────────── */

function AddLeadsModal({
  campaignId,
  campaignName,
  contacts,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  campaignName: string;
  contacts: ContactForSelection[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<"csv" | "manual" | "existing">("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CSV state
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  // Existing contacts state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out contacts already in this campaign and DNC
  const availableContacts = contacts.filter(
    (c) => !c.is_dnc && !c.leads.some((l) => l.campaign_id === campaignId)
  );
  const filteredContacts = searchQuery
    ? availableContacts.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.first_name.toLowerCase().includes(q) ||
          (c.last_name?.toLowerCase().includes(q) ?? false) ||
          c.phone.includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false) ||
          (c.company?.toLowerCase().includes(q) ?? false)
        );
      })
    : availableContacts;

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddExisting = async () => {
    if (selectedIds.size === 0) { setError("Select at least one contact"); return; }
    setLoading(true);
    setError(null);
    const result = await addLeadsFromContacts(Array.from(selectedIds), campaignId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      alert(`Added ${result.imported} leads (${result.duplicates} duplicates)`);
      onSuccess();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    if (f) {
      f.text().then((text) => {
        const lines = text.trim().split("\n");
        setRowCount(Math.max(0, lines.length - 1));
      });
    } else {
      setRowCount(0);
    }
  };

  const handleCsvImport = async () => {
    if (!file) { setError("Select a CSV file"); return; }
    setLoading(true);
    setError(null);
    const csvText = await file.text();
    const { data, error: err } = await callEdgeFunction<{
      imported: number;
      duplicates: number;
      dnc_excluded: number;
    }>("import-leads", { campaign_id: campaignId, csv: csvText });
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

  const handleManualAdd = async () => {
    if (!phone.trim()) { setError("Phone number is required"); return; }
    setLoading(true);
    setError(null);
    const csv = `first_name,last_name,phone,email,company\n${firstName},${lastName},${phone},${email},${company}`;
    const { error: err } = await callEdgeFunction("import-leads", {
      campaign_id: campaignId,
      csv,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      alert("Lead added successfully");
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border-default bg-[#141820] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Add Leads</h2>
            <p className="text-[11px] text-text-dim">to {campaignName}</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-muted">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-[rgba(255,255,255,0.04)] p-1">
          <button
            onClick={() => { setTab("csv"); setError(null); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors",
              tab === "csv"
                ? "bg-[rgba(255,255,255,0.08)] text-text-primary"
                : "text-text-dim hover:text-text-muted"
            )}
          >
            <Upload size={13} /> Import CSV
          </button>
          <button
            onClick={() => { setTab("manual"); setError(null); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors",
              tab === "manual"
                ? "bg-[rgba(255,255,255,0.08)] text-text-primary"
                : "text-text-dim hover:text-text-muted"
            )}
          >
            <UserPlus size={13} /> Add Manually
          </button>
          <button
            onClick={() => { setTab("existing"); setError(null); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors",
              tab === "existing"
                ? "bg-[rgba(255,255,255,0.08)] text-text-primary"
                : "text-text-dim hover:text-text-muted"
            )}
          >
            <Users size={13} /> Existing
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-red-light">
            {error}
          </div>
        )}

        {tab === "csv" && (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border-default bg-surface-card p-6 text-center transition-colors hover:border-emerald-dark"
            >
              <Upload size={28} className="text-text-dim" />
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
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={handleCsvImport}
              disabled={loading || !file}
              className="w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              {loading ? "Importing..." : "Import Leads"}
            </Button>
          </div>
        )}

        {tab === "manual" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] text-text-dim">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-text-dim">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-dim">Phone *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none placeholder:text-text-faint"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-dim">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-dim">Company</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
              />
            </div>
            <Button
              onClick={handleManualAdd}
              disabled={loading || !phone.trim()}
              className="w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              {loading ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        )}

        {tab === "existing" && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] py-[9px] pl-9 pr-3 text-[13px] text-text-primary outline-none placeholder:text-text-faint"
              />
            </div>
            {availableContacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                No available contacts. All contacts are already in this campaign or on the DNC list.
              </p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto rounded-lg border border-border-default">
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleContact(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border-default px-3 py-2.5 text-left transition-colors last:border-b-0",
                      selectedIds.has(c.id)
                        ? "bg-emerald-bg"
                        : "hover:bg-[rgba(255,255,255,0.03)]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        selectedIds.has(c.id)
                          ? "border-emerald-dark bg-emerald-dark text-white"
                          : "border-border-default"
                      )}
                    >
                      {selectedIds.has(c.id) && <span className="text-[10px]">✓</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text-primary">
                        {c.first_name} {c.last_name ?? ""}
                      </div>
                      <div className="truncate text-[10px] text-text-dim">
                        {c.phone}{c.email ? ` · ${c.email}` : ""}{c.company ? ` · ${c.company}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && searchQuery && (
                  <p className="py-4 text-center text-xs text-text-dim">No contacts match your search.</p>
                )}
              </div>
            )}
            {selectedIds.size > 0 && (
              <p className="text-xs text-text-muted">{selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected</p>
            )}
            <Button
              onClick={handleAddExisting}
              disabled={loading || selectedIds.size === 0}
              className="w-full justify-center bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              {loading ? "Adding..." : `Add ${selectedIds.size || ""} Lead${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
