"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarCheck,
  Zap,
  ChevronRight,
  Phone,
  Check,
  TrendingUp,
  Timer,
  Target,
  MessageSquare,
  Mail,
  Calendar,
  Ban,
  XCircle,
  Bookmark,
  PhoneCall,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionLabel } from "@/components/ui/section-label";
import { OutcomeRow } from "@/components/ui/outcome-row";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ColoredBadge } from "@/components/ui/colored-badge";
import {
  ActionDropdown,
  type ActionOption,
} from "@/components/ui/action-dropdown";
import { tokens } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { resolveActionItem, unresolveActionItem } from "@/lib/actions/action-items";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";
import type {
  DashboardStats,
  DashboardAppointment,
  DashboardActionItem,
  DashboardCampaign,
  CallOutcomeCount,
  FunnelData,
  EngagedLeadsData,
} from "@/types";

type ActionItemTypeBadge = "sms_reply" | "callback_request" | "hot_lead" | "email_engagement" | "manual_booking_needed";
const typeBadge: Record<string, { label: string; color: "emerald" | "amber" | "blue" }> = {
  sms_reply: { label: "SMS", color: "emerald" },
  callback_request: { label: "Callback", color: "amber" },
  hot_lead: { label: "Interest", color: "blue" },
  email_engagement: { label: "Email", color: "blue" },
  manual_booking_needed: { label: "Booking", color: "amber" },
};

const OUTCOME_LABELS: Record<string, string> = {
  booked: "Booked",
  interested: "Interested",
  callback: "Callback",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  not_interested: "Not Int.",
  wrong_number: "Wrong #",
  dnc: "DNC",
};

const OUTCOME_COLORS: Record<string, string> = {
  booked: tokens.emerald,
  interested: tokens.blue,
  callback: tokens.amber,
  voicemail: "rgba(255,255,255,0.15)",
  no_answer: "rgba(255,255,255,0.08)",
  not_interested: "rgba(248,113,113,0.5)",
  wrong_number: "rgba(248,113,113,0.35)",
  dnc: "rgba(248,113,113,0.2)",
};

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "all" },
] as const;

export function DashboardClient({
  userName,
  range,
  stats,
  engaged,
  outcomes,
  funnel,
  appointments,
  actionItems,
  campaigns,
}: {
  userName: string;
  range: string;
  stats: DashboardStats;
  engaged: EngagedLeadsData;
  outcomes: CallOutcomeCount[];
  funnel: FunnelData;
  appointments: DashboardAppointment[];
  actionItems: DashboardActionItem[];
  campaigns: DashboardCampaign[];
}) {
  const [resolved, setResolved] = useState<
    Record<string, { label: string; color: string }>
  >({});

  const handleResolve = async (
    id: string,
    label: string,
    color: string,
    resolutionType: string
  ) => {
    setResolved((p) => ({ ...p, [id]: { label, color } }));
    await resolveActionItem(id, resolutionType);
  };

  const handleUndo = async (id: string) => {
    setResolved((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    await unresolveActionItem(id);
  };

  const unresolvedCount = actionItems.filter((a) => !resolved[a.id]).length;
  const maxOutcome = Math.max(...outcomes.map((o) => o.count), 1);

  // Engagement percentage
  const engagedPct =
    engaged.total > 0
      ? ((engaged.active + engaged.closed) / engaged.total * 100).toFixed(1)
      : "0";

  // Funnel values
  const funnelEntries: [string, number, number][] = [
    ["Leads", funnel.leads, 100],
    ["Attempts", funnel.attempts, funnel.leads > 0 ? Math.round((funnel.attempts / funnel.leads) * 100) : 0],
    ["Connected", funnel.connected, funnel.leads > 0 ? Math.round((funnel.connected / funnel.leads) * 100) : 0],
    ["Interested", funnel.interested, funnel.leads > 0 ? Math.round((funnel.interested / funnel.leads) * 100) : 0],
    ["Booked", funnel.booked, funnel.leads > 0 ? Math.round((funnel.booked / funnel.leads) * 100) : 0],
    ["Showed", funnel.showed, funnel.leads > 0 ? Math.round((funnel.showed / funnel.leads) * 100) : 0],
    ["Closed", funnel.closed, funnel.leads > 0 ? Math.round((funnel.closed / funnel.leads) * 100) : 0],
  ];

  const conversionPct = funnel.leads > 0
    ? ((funnel.closed / funnel.leads) * 100).toFixed(1)
    : "0";

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Good morning, {userName}
          </h1>
          <p className="mt-1 text-[13px] text-text-dim">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          asChild
          className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          <Link href="/campaigns/new">
            <Plus size={15} /> New Campaign
          </Link>
        </Button>
      </div>

      {/* ACTION ZONE */}
      <SectionLabel className="text-emerald-light">Action Zone</SectionLabel>

      {/* Today's Appointments */}
      <div className="mb-2.5 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
          <div className="flex items-center gap-1.5">
            <CalendarCheck size={13} className="text-emerald-light" />
            <span className="text-xs font-semibold text-text-primary">
              Today&apos;s Appointments
            </span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-light">
            {appointments.length} scheduled
          </span>
        </div>
        {appointments.length > 0 ? (
          appointments.map((a, i) => (
            <Link
              key={a.id}
              href="/leads"
              className={`flex items-center gap-2.5 px-4 py-[9px] transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                i < appointments.length - 1
                  ? "border-b border-border-light"
                  : ""
              }`}
            >
              <span className="w-[60px] shrink-0 text-xs font-semibold tabular-nums text-emerald-light">
                {a.time}
              </span>
              <span className="flex-1 truncate text-xs font-semibold text-text-primary">
                {a.name}
              </span>
              <span className="shrink-0 text-[11px] text-text-dim">
                {a.company}
              </span>
              <ChevronRight size={12} className="shrink-0 text-text-faint" />
            </Link>
          ))
        ) : (
          <div className="px-4 py-4 text-center text-[12px] text-text-dim">
            No appointments today
          </div>
        )}
      </div>

      {/* Action Items */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-light" />
            <span className="text-xs font-semibold text-text-primary">
              Action Items
            </span>
          </div>
          <span className="text-[10px] font-semibold text-amber-light">
            {unresolvedCount} need attention
          </span>
        </div>
        {actionItems.length > 0 ? (
          actionItems.map((a, i) => {
            const r = resolved[a.id];
            const badge = typeBadge[a.type];

            if (r) {
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-2.5 px-4 py-2 opacity-45 ${
                    i < actionItems.length - 1
                      ? "border-b border-border-light"
                      : ""
                  }`}
                >
                  <Check
                    size={12}
                    style={{ color: r.color }}
                    className="shrink-0"
                  />
                  <span className="text-[11px] text-text-dim">{a.name}</span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: r.color }}
                  >
                    {r.label}
                  </span>
                  <button
                    onClick={() => handleUndo(a.id)}
                    className="ml-auto px-1.5 py-0.5 text-[10px] text-text-faint hover:text-text-muted"
                  >
                    Undo
                  </button>
                </div>
              );
            }

            const followUpOptions: ActionOption[] = [
              {
                label: "Call Now",
                icon: <PhoneCall size={13} />,
                color: tokens.emerald,
                onClick: async () => {
                  if (!a.agent_id) {
                    alert("No agent assigned to this lead's campaign");
                    return;
                  }
                  const { error } = await callEdgeFunction("initiate-call", {
                    agent_id: a.agent_id,
                    lead_id: a.lead_id,
                    contact_id: a.contact_id,
                  });
                  if (error) alert(`Call failed: ${error}`);
                  else alert("Call initiated");
                },
              },
              {
                label: "Send Text",
                icon: <MessageSquare size={13} />,
                color: tokens.blue,
                onClick: () => {},
              },
              {
                label: "Schedule Callback",
                icon: <Calendar size={13} />,
                color: tokens.amber,
                onClick: () => {},
              },
              {
                label: "Send Email",
                icon: <Mail size={13} />,
                color: tokens.purple,
                onClick: () => {},
              },
            ];

            const resolveOptions: ActionOption[] = [
              {
                label: "Appointment Scheduled",
                icon: <CalendarCheck size={13} />,
                color: tokens.emerald,
                onClick: () =>
                  handleResolve(
                    a.id,
                    "Appointment Scheduled",
                    tokens.emerald,
                    "appointment_scheduled"
                  ),
              },
              {
                label: "Follow-up Scheduled",
                icon: <Bookmark size={13} />,
                color: tokens.blue,
                onClick: () =>
                  handleResolve(
                    a.id,
                    "Follow-up Scheduled",
                    tokens.blue,
                    "followup_scheduled"
                  ),
              },
              {
                label: "Not Interested",
                icon: <XCircle size={13} />,
                color: tokens.red,
                onClick: () =>
                  handleResolve(
                    a.id,
                    "Not Interested",
                    tokens.red,
                    "not_interested"
                  ),
              },
              {
                label: "Wrong Number",
                icon: <Ban size={13} />,
                color: tokens.red,
                onClick: () =>
                  handleResolve(
                    a.id,
                    "Wrong Number",
                    tokens.red,
                    "wrong_number"
                  ),
              },
              {
                label: "Dismiss",
                icon: <X size={13} />,
                color: "rgba(255,255,255,0.3)",
                onClick: () =>
                  handleResolve(
                    a.id,
                    "Dismissed",
                    "rgba(255,255,255,0.3)",
                    "dismissed"
                  ),
              },
            ];

            return (
              <div
                key={a.id}
                className={`flex items-center gap-2.5 px-4 py-[10px] ${
                  i < actionItems.length - 1
                    ? "border-b border-border-light"
                    : ""
                }`}
              >
                <span className="w-[42px] shrink-0 text-[10px] text-text-dim">
                  {a.time}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-text-primary">
                      {a.name}
                    </span>
                    {badge && (
                      <ColoredBadge color={badge.color}>
                        {badge.label}
                      </ColoredBadge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-text-dim">
                    {a.reason}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <ActionDropdown
                    label="Follow Up"
                    icon={<Phone size={10} />}
                    options={followUpOptions}
                    variant="default"
                  />
                  <ActionDropdown
                    label="Resolve"
                    icon={<Check size={10} />}
                    options={resolveOptions}
                    variant="ghost"
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-4 text-center text-[12px] text-text-dim">
            No action items
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel className="mb-0">Results</SectionLabel>
        <div className="flex gap-0.5 rounded-lg bg-surface-input p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <Link
              key={r.value}
              href={`?range=${r.value}`}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                range === r.value
                  ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                  : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard
          label="Appointments"
          value={stats.appointments}
          icon={<CalendarCheck size={14} />}
          accent={tokens.emerald}
        />
        <StatCard
          label="Est. Revenue"
          value={formatCurrency(stats.estRevenue)}
          subtitle="attributed"
          icon={<TrendingUp size={14} />}
          accent={tokens.blue}
        />
        <StatCard
          label="Hours Saved"
          value={stats.hoursSaved}
          subtitle="of outreach calling"
          icon={<Timer size={14} />}
          accent={tokens.amber}
        />
        <StatCard
          label="Active Pipeline"
          value={stats.activePipeline}
          subtitle="total leads"
          icon={<Target size={14} />}
          accent={tokens.purple}
        />
      </div>

      {/* Engaged leads + Call outcomes */}
      <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {/* Engaged Leads */}
        <div
          className="rounded-xl border border-[rgba(52,211,153,0.15)] p-[18px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, transparent 60%)",
          }}
        >
          <SectionLabel className="text-[rgba(52,211,153,0.5)]">
            Engaged Leads
          </SectionLabel>
          <div className="flex items-baseline gap-2.5">
            <div className="text-4xl font-extrabold leading-none tabular-nums text-text-primary">
              {engaged.total}
            </div>
            <span className="text-xs text-emerald-light opacity-80">
              {engagedPct}% engaged
            </span>
          </div>
          <div className="mt-3.5 flex gap-5">
            {(
              [
                ["New", engaged.new, "text-text-muted"],
                ["Active", engaged.active, "text-emerald-light"],
                ["Closed", engaged.closed, "text-blue-light"],
              ] as const
            ).map(([label, val, color]) => (
              <div key={label}>
                <span className="text-[10px] text-text-dim">{label}</span>
                <div className={`text-lg font-bold tabular-nums ${color}`}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call Outcomes */}
        <div className="rounded-xl border border-border-default bg-surface-card p-[18px]">
          <SectionLabel>Call Outcomes</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {outcomes.map((o) => (
              <OutcomeRow
                key={o.outcome}
                label={OUTCOME_LABELS[o.outcome] ?? o.outcome}
                value={o.count}
                max={maxOutcome}
                color={OUTCOME_COLORS[o.outcome] ?? "rgba(255,255,255,0.1)"}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="mb-3.5 rounded-xl border border-border-default bg-surface-card p-[18px]">
        <SectionLabel>Conversion Funnel</SectionLabel>
        <div className="flex items-end">
          {funnelEntries.map(([label, val, pct], i) => {
            const barH = Math.max(16, (pct / 100) * 90);
            const colors = [
              "rgba(255,255,255,0.15)",
              "rgba(255,255,255,0.12)",
              `${tokens.blue}30`,
              `${tokens.amber}30`,
              tokens.emerald,
              tokens.emerald,
              tokens.emerald,
            ];
            const isHighlight = i >= 4;
            return (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`text-sm font-bold tabular-nums ${
                    isHighlight ? "text-emerald-light" : "text-text-primary"
                  }`}
                >
                  {val}
                </div>
                <div
                  className="w-4/5 rounded-t transition-all duration-700"
                  style={{ height: barH, background: colors[i] }}
                />
                <div className="text-center text-[9px] text-text-dim">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[rgba(52,211,153,0.04)] px-3 py-2">
          <span className="text-[11px] text-text-dim">
            Overall conversion
          </span>
          <span className="text-[11px] font-bold text-emerald-light">
            {funnel.leads} leads → {funnel.closed} closed ({conversionPct}%)
          </span>
        </div>
      </div>

      {/* ACTIVE CAMPAIGNS */}
      <SectionLabel>Active Campaigns</SectionLabel>
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href="/campaigns"
              className="rounded-xl border border-border-default bg-surface-card p-3.5 transition-all hover:bg-surface-card-hover"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="mr-1.5 truncate text-xs font-semibold text-text-primary">
                  {c.name}
                </span>
                <ColoredBadge
                  color={c.status === "active" ? "emerald" : "amber"}
                >
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </ColoredBadge>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar value={c.callsMade} max={c.totalLeads} />
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-text-dim">
                  {c.totalLeads > 0
                    ? Math.round((c.callsMade / c.totalLeads) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="rounded-md bg-emerald-bg px-2.5 py-1 text-center">
                  <span className="text-lg font-extrabold tabular-nums text-emerald-light">
                    {c.booked}
                  </span>
                  <span className="ml-0.5 text-[8px] font-semibold text-emerald-light opacity-60">
                    BOOKED
                  </span>
                </div>
                <div className="flex flex-1 justify-around">
                  {(
                    [
                      [c.connected, "Conn."],
                      [c.remaining, "Left"],
                    ] as const
                  ).map(([val, label]) => (
                    <div key={label} className="text-center">
                      <div className="text-xs font-semibold tabular-nums text-text-primary">
                        {val}
                      </div>
                      <div className="text-[8px] text-text-dim">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-default bg-surface-card px-5 py-8 text-center text-[13px] text-text-dim">
          No active campaigns
        </div>
      )}
    </div>
  );
}
