"use client";

import { useState } from "react";
import {
  ExternalLink,
  Database,
  GitBranch,
  CreditCard,
  Phone,
  PhoneCall,
  Globe,
  Mail,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

type WorkflowEvent = {
  id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  org_id: string | null;
  created_at: string;
};

const quickLinks = [
  {
    name: "Supabase Dashboard",
    url: "https://supabase.com/dashboard",
    description: "Database, auth, and storage management",
    icon: Database,
    color: "text-emerald-400",
  },
  {
    name: "N8N",
    url: "https://n8n.courtside-ai.com",
    description: "Workflow orchestration and automation",
    icon: GitBranch,
    color: "text-purple-400",
  },
  {
    name: "Stripe Dashboard",
    url: "https://dashboard.stripe.com",
    description: "Payments, subscriptions, and invoices",
    icon: CreditCard,
    color: "text-blue-400",
  },
  {
    name: "Retell",
    url: "https://www.retellai.com",
    description: "AI voice agent configuration",
    icon: PhoneCall,
    color: "text-amber-400",
  },
  {
    name: "Twilio Console",
    url: "https://console.twilio.com",
    description: "Telephony and SMS management",
    icon: Phone,
    color: "text-red-400",
  },
  {
    name: "Vercel",
    url: "https://vercel.com/dashboard",
    description: "Deployment and hosting",
    icon: Globe,
    color: "text-text-primary",
  },
  {
    name: "SendGrid",
    url: "https://app.sendgrid.com",
    description: "Transactional email delivery",
    icon: Mail,
    color: "text-blue-300",
  },
];

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Pending", value: "pending" },
];

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "Completed" },
  failed: { bg: "bg-red-400/10", text: "text-red-400", label: "Failed" },
  pending: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Pending" },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? { bg: "bg-white/5", text: "text-text-dim", label: status };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function SystemClient({ events }: { events: WorkflowEvent[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = events.filter(
    (e) => statusFilter === "all" || e.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">System</h1>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-border-default bg-surface-card p-4 transition-colors hover:bg-surface-card-hover"
            >
              <link.icon size={18} className={`mt-0.5 ${link.color}`} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">{link.name}</span>
                  <ExternalLink
                    size={11}
                    className="text-text-dim transition-colors group-hover:text-amber-400"
                  />
                </div>
                <p className="mt-0.5 text-xs text-text-dim">{link.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Workflow Events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
            Workflow Events
          </h2>
          <div className="flex gap-1 rounded-lg bg-surface-card p-1">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-text-dim hover:text-text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Event Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Error
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Org ID
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-text-dim" />
                    <p className="text-sm text-text-dim">No workflow events found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((event) => (
                  <>
                    <tr
                      key={event.id}
                      onClick={() =>
                        setExpandedId(expandedId === event.id ? null : event.id)
                      }
                      className="cursor-pointer border-b border-border-default transition-colors last:border-b-0 hover:bg-surface-card-hover"
                    >
                      <td className="px-2 py-3 text-center text-text-dim">
                        {expandedId === event.id ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {event.event_type}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-text-muted">
                        {event.error_message ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-dim">
                        {event.org_id ? event.org_id.slice(0, 8) + "..." : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                    {expandedId === event.id && (
                      <tr key={`${event.id}-detail`} className="border-b border-border-default">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="rounded-lg bg-[#0a0d12] p-4">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                              Payload
                            </p>
                            <pre className="max-h-64 overflow-auto text-xs text-text-muted">
                              {event.payload
                                ? JSON.stringify(event.payload, null, 2)
                                : "No payload"}
                            </pre>
                            {event.error_message && (
                              <>
                                <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                                  Error Message
                                </p>
                                <p className="text-xs text-red-400">{event.error_message}</p>
                              </>
                            )}
                            {event.org_id && (
                              <>
                                <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim">
                                  Org ID
                                </p>
                                <p className="font-mono text-xs text-text-muted">{event.org_id}</p>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
