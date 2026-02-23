"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Phone, X, Loader2, Trash2 } from "lucide-react";
import { addPhoneNumber, deletePhoneNumber } from "@/lib/actions/admin";

type PhoneRow = {
  id: string;
  number: string;
  friendly_name: string | null;
  type: string | null;
  status: string;
  org_id: string | null;
  agent_id: string | null;
  assigned_to: string | null;
  total_calls_handled: number;
  total_texts_sent: number;
  created_at: string;
  orgName: string | null;
  agentName: string | null;
};

type Org = { id: string; name: string };

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  inactive: { bg: "bg-red-400/10", text: "text-red-400" },
};

export function PhoneNumbersClient({
  phoneNumbers,
  organizations,
}: {
  phoneNumbers: PhoneRow[];
  organizations: Org[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = phoneNumbers.filter((pn) => {
    if (statusFilter !== "all" && pn.status !== statusFilter) return false;
    if (assignmentFilter === "assigned" && !pn.agent_id) return false;
    if (assignmentFilter === "unassigned" && pn.agent_id) return false;
    return true;
  });

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addPhoneNumber(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this phone number?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deletePhoneNumber(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Phone Numbers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Number"}
        </button>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-amber-400/20 bg-surface-card p-5"
        >
          <h2 className="text-sm font-semibold text-text-primary">Add Phone Number</h2>

          {error && (
            <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Number (E.164) *
              </label>
              <input
                name="number"
                required
                placeholder="+18005551234"
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Friendly Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Label
              </label>
              <input
                name="friendly_name"
                placeholder="Main Line"
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Organization *
              </label>
              <select
                name="org_id"
                required
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
              >
                <option value="">Select...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Agent ID
              </label>
              <input
                name="agent_id"
                placeholder="UUID (optional)"
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Type
              </label>
              <select
                name="type"
                defaultValue="local"
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
              >
                <option value="local">Local</option>
                <option value="toll_free">Toll Free</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                Status
              </label>
              <select
                name="status"
                defaultValue="active"
                className="w-full rounded-lg border border-border-default bg-[#0e1117] px-3 py-2 text-sm text-text-primary outline-none focus:border-amber-400/50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Number"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-amber-400/50"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Assignment
          </span>
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm text-text-primary outline-none focus:border-amber-400/50"
          >
            <option value="all">All</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        <span className="ml-auto text-xs text-text-dim">
          {filtered.length} number{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface-card py-16">
          <Phone size={32} className="text-text-dim" />
          <p className="mt-3 text-sm text-text-muted">No phone numbers found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Number
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Agent
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Calls
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Texts
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pn, i) => {
                const sc = statusColors[pn.status] ?? statusColors.inactive;

                return (
                  <tr
                    key={pn.id}
                    className={`border-b border-border-default transition-colors hover:bg-surface-card-hover ${
                      i % 2 === 1 ? "bg-white/[0.015]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-text-dim" />
                        <span className="font-medium text-text-primary">{pn.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {pn.friendly_name || <span className="text-text-dim">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-text-muted">{pn.type ?? "local"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${sc.bg} ${sc.text}`}
                      >
                        {pn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {pn.orgName || <span className="text-text-dim">--</span>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {pn.agentName || <span className="text-text-dim">--</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {pn.total_calls_handled.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {pn.total_texts_sent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(pn.id)}
                        disabled={deletingId === pn.id}
                        className="rounded p-1 text-text-dim transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === pn.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
