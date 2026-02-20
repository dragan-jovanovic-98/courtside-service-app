"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Phone,
  Mail,
  User,
  Search,
  Upload,
  Plus,
  MessageSquare,
  CalendarCheck,
  Check,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/utils";
import {
  type BadgeColor,
  outcomeBadgeColor,
  leadBadgeColor,
} from "@/lib/design-tokens";
import { updateLeadStatus } from "@/lib/actions/leads";
import type { LeadListItem, TimelineEvent } from "@/types";

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

export function LeadsClient({
  leads,
  stats,
}: {
  leads: LeadListItem[];
  stats: { total: number; followUps: number; appointments: number; new: number };
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [timeline] = useState<TimelineEvent[]>([]);

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
    return matchesSearch && matchesStatus && matchesOutcome;
  });

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
                <div className="mb-2 flex gap-1.5">
                  <Button
                    onClick={() => handleStatusChange("closed_won")}
                    className="flex-1 justify-center gap-1 bg-emerald-dark text-xs text-white hover:bg-emerald-dark/90"
                  >
                    <Check size={12} /> Closed Won
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("closed_lost")}
                    variant="ghost"
                    className="flex-1 justify-center gap-1 text-xs text-red-light"
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
              <Button className="justify-center gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
                <Phone size={13} /> Call Now
              </Button>
              <Button variant="ghost" className="justify-center gap-1.5">
                <MessageSquare size={13} /> Text
              </Button>
              <Button variant="ghost" className="justify-center gap-1.5">
                <Mail size={13} /> Email
              </Button>
            </div>
          </div>

          {/* Right column — Timeline */}
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
    );
  }

  // List View
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <div className="flex gap-2">
          <Button variant="ghost" className="gap-1.5">
            <Upload size={14} /> Import
          </Button>
          <Button className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
            <Plus size={14} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
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
      </div>

      {/* Leads table */}
      <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              {["Name", "Phone", "Status", "Outcome", "Last", "Campaign"].map(
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
                  colSpan={6}
                  className="px-4 py-6 text-center text-[13px] text-text-dim"
                >
                  No leads match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
