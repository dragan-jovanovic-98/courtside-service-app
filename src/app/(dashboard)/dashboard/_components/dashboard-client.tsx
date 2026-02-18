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
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionLabel } from "@/components/ui/section-label";
import { OutcomeRow } from "@/components/ui/outcome-row";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { ActionDropdown, type ActionOption } from "@/components/ui/action-dropdown";
import { tokens } from "@/lib/design-tokens";
import {
  mockAppointments,
  mockActionItems,
  mockCampaigns,
} from "@/lib/mock-data";

type ActionItemTypeBadge = "sms" | "cb" | "int" | "em";
const typeBadge: Record<ActionItemTypeBadge, { label: string; color: "emerald" | "amber" | "blue" }> = {
  sms: { label: "SMS", color: "emerald" },
  cb: { label: "Callback", color: "amber" },
  int: { label: "Interest", color: "blue" },
  em: { label: "Email", color: "blue" },
};

export function DashboardClient({ userName }: { userName: string }) {
  const [range, setRange] = useState("7d");
  const [resolved, setResolved] = useState<Record<string, { label: string; color: string }>>({});

  const handleResolve = (id: string, label: string, color: string) => {
    setResolved((p) => ({ ...p, [id]: { label, color } }));
  };

  const handleUndo = (id: string) => {
    setResolved((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  const unresolvedCount = mockActionItems.filter((a) => !resolved[a.id]).length;
  const activeCampaigns = mockCampaigns.filter((c) => c.status === "active" || c.status === "paused");

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Good morning, {userName}
          </h1>
          <p className="mt-1 text-[13px] text-text-dim">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button asChild className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
          <Link href="/campaigns/new">
            <Plus size={15} /> New Campaign
          </Link>
        </Button>
      </div>

      {/* ── ACTION ZONE ──────────────────────────────────────────── */}
      <SectionLabel className="text-emerald-light">Action Zone</SectionLabel>

      {/* Today's Appointments */}
      <div className="mb-2.5 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
          <div className="flex items-center gap-1.5">
            <CalendarCheck size={13} className="text-emerald-light" />
            <span className="text-xs font-semibold text-text-primary">Today&apos;s Appointments</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-light">
            {mockAppointments.length} scheduled
          </span>
        </div>
        {mockAppointments.map((a, i) => (
          <Link
            key={a.id}
            href="/leads"
            className={`flex items-center gap-2.5 px-4 py-[9px] transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
              i < mockAppointments.length - 1 ? "border-b border-border-light" : ""
            }`}
          >
            <span className="w-[60px] shrink-0 text-xs font-semibold tabular-nums text-emerald-light">{a.time}</span>
            <span className="flex-1 truncate text-xs font-semibold text-text-primary">{a.name}</span>
            <span className="shrink-0 text-[11px] text-text-dim">{a.company}</span>
            <ChevronRight size={12} className="shrink-0 text-text-faint" />
          </Link>
        ))}
      </div>

      {/* Action Items */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-light" />
            <span className="text-xs font-semibold text-text-primary">Action Items</span>
          </div>
          <span className="text-[10px] font-semibold text-amber-light">
            {unresolvedCount} need attention
          </span>
        </div>
        {mockActionItems.map((a, i) => {
          const r = resolved[a.id];
          const badge = typeBadge[a.type as ActionItemTypeBadge];

          if (r) {
            return (
              <div
                key={a.id}
                className={`flex items-center gap-2.5 px-4 py-2 opacity-45 ${
                  i < mockActionItems.length - 1 ? "border-b border-border-light" : ""
                }`}
              >
                <Check size={12} style={{ color: r.color }} className="shrink-0" />
                <span className="text-[11px] text-text-dim">{a.name}</span>
                <span className="text-[10px] font-semibold" style={{ color: r.color }}>{r.label}</span>
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
            { label: "Call Now", icon: <PhoneCall size={13} />, color: tokens.emerald, onClick: () => {} },
            { label: "Send Text", icon: <MessageSquare size={13} />, color: tokens.blue, onClick: () => {} },
            { label: "Schedule Callback", icon: <Calendar size={13} />, color: tokens.amber, onClick: () => {} },
            { label: "Send Email", icon: <Mail size={13} />, color: tokens.purple, onClick: () => {} },
          ];

          const resolveOptions: ActionOption[] = [
            { label: "Appointment Scheduled", icon: <CalendarCheck size={13} />, color: tokens.emerald, onClick: () => handleResolve(a.id, "Appointment Scheduled", tokens.emerald) },
            { label: "Follow-up Scheduled", icon: <Bookmark size={13} />, color: tokens.blue, onClick: () => handleResolve(a.id, "Follow-up Scheduled", tokens.blue) },
            { label: "Not Interested", icon: <XCircle size={13} />, color: tokens.red, onClick: () => handleResolve(a.id, "Not Interested", tokens.red) },
            { label: "Wrong Number", icon: <Ban size={13} />, color: tokens.red, onClick: () => handleResolve(a.id, "Wrong Number", tokens.red) },
            { label: "Dismiss", icon: <X size={13} />, color: "rgba(255,255,255,0.3)", onClick: () => handleResolve(a.id, "Dismissed", "rgba(255,255,255,0.3)") },
          ];

          return (
            <div
              key={a.id}
              className={`flex items-center gap-2.5 px-4 py-[10px] ${
                i < mockActionItems.length - 1 ? "border-b border-border-light" : ""
              }`}
            >
              <span className="w-[42px] shrink-0 text-[10px] text-text-dim">{a.time}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-text-primary">{a.name}</span>
                  {badge && <ColoredBadge color={badge.color}>{badge.label}</ColoredBadge>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-text-dim">{a.reason}</p>
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
        })}
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel className="mb-0">Results</SectionLabel>
        <div className="flex gap-0.5 rounded-lg bg-surface-input p-0.5">
          {["Today", "7d", "30d", "All"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                range === r
                  ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                  : "text-text-dim hover:text-text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-3 grid grid-cols-4 gap-2.5">
        <StatCard label="Appointments" value={42} subtitle="+8 this week" icon={<CalendarCheck size={14} />} accent={tokens.emerald} />
        <StatCard label="Est. Revenue" value="$127.5K" subtitle="attributed" icon={<TrendingUp size={14} />} accent={tokens.blue} />
        <StatCard label="Hours Saved" value={156} subtitle="of outreach calling" icon={<Timer size={14} />} accent={tokens.amber} />
        <StatCard label="Active Pipeline" value={890} subtitle="total leads" icon={<Target size={14} />} accent={tokens.purple} />
      </div>

      {/* Engaged leads + Call outcomes */}
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        {/* Engaged Leads */}
        <div className="rounded-xl border border-[rgba(52,211,153,0.15)] p-[18px]" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, transparent 60%)" }}>
          <SectionLabel className="text-[rgba(52,211,153,0.5)]">Engaged Leads</SectionLabel>
          <div className="flex items-baseline gap-2.5">
            <div className="text-4xl font-extrabold leading-none tabular-nums text-text-primary">347</div>
            <span className="text-xs text-emerald-light opacity-80">47.2% engaged</span>
          </div>
          <div className="mt-3.5 flex gap-5">
            {([["New", 189, "text-text-muted"], ["Active", 112, "text-emerald-light"], ["Closed", 46, "text-blue-light"]] as const).map(([label, val, color]) => (
              <div key={label}>
                <span className="text-[10px] text-text-dim">{label}</span>
                <div className={`text-lg font-bold tabular-nums ${color}`}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Call Outcomes */}
        <div className="rounded-xl border border-border-default bg-surface-card p-[18px]">
          <SectionLabel>Call Outcomes</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <OutcomeRow label="Booked" value={42} max={120} color={tokens.emerald} />
            <OutcomeRow label="Interested" value={67} max={120} color={tokens.blue} />
            <OutcomeRow label="Callback" value={28} max={120} color={tokens.amber} />
            <OutcomeRow label="Voicemail" value={89} max={120} color="rgba(255,255,255,0.15)" />
            <OutcomeRow label="No Answer" value={54} max={120} color="rgba(255,255,255,0.08)" />
            <OutcomeRow label="Not Int." value={38} max={120} color="rgba(248,113,113,0.5)" />
            <OutcomeRow label="Wrong #" value={12} max={120} color="rgba(248,113,113,0.35)" />
            <OutcomeRow label="DNC" value={7} max={120} color="rgba(248,113,113,0.2)" />
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="mb-3.5 rounded-xl border border-border-default bg-surface-card p-[18px]">
        <SectionLabel>Conversion Funnel</SectionLabel>
        <div className="flex items-end">
          {([
            ["Leads", 890, 100],
            ["Attempts", 632, 71],
            ["Connected", 325, 37],
            ["Interested", 142, 16],
            ["Booked", 42, 5],
            ["Showed", 35, 4],
            ["Closed", 18, 2],
          ] as const).map(([label, val, pct], i) => {
            const barH = Math.max(16, (pct / 100) * 90);
            const colors = ["rgba(255,255,255,0.15)", "rgba(255,255,255,0.12)", `${tokens.blue}30`, `${tokens.amber}30`, tokens.emerald, tokens.emerald, tokens.emerald];
            const isHighlight = i >= 4;
            return (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div className={`text-sm font-bold tabular-nums ${isHighlight ? "text-emerald-light" : "text-text-primary"}`}>{val}</div>
                <div
                  className="w-4/5 rounded-t transition-all duration-700"
                  style={{ height: barH, background: colors[i] }}
                />
                <div className="text-center text-[9px] text-text-dim">{label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[rgba(52,211,153,0.04)] px-3 py-2">
          <span className="text-[11px] text-text-dim">Overall conversion</span>
          <span className="text-[11px] font-bold text-emerald-light">890 leads → 18 closed (2.0%)</span>
        </div>
      </div>

      {/* ── ACTIVE CAMPAIGNS ─────────────────────────────────────── */}
      <SectionLabel>Active Campaigns</SectionLabel>
      <div className="grid grid-cols-3 gap-2.5">
        {activeCampaigns.map((c) => (
          <Link
            key={c.id}
            href="/campaigns"
            className="rounded-xl border border-border-default bg-surface-card p-3.5 transition-all hover:bg-surface-card-hover"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="mr-1.5 truncate text-xs font-semibold text-text-primary">{c.name}</span>
              <ColoredBadge color={c.status === "active" ? "emerald" : "amber"}>
                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
              </ColoredBadge>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar value={c.callsMade} max={c.totalLeads} />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-text-dim">
                {c.totalLeads > 0 ? Math.round((c.callsMade / c.totalLeads) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-md bg-emerald-bg px-2.5 py-1 text-center">
                <span className="text-lg font-extrabold tabular-nums text-emerald-light">{c.booked}</span>
                <span className="ml-0.5 text-[8px] font-semibold text-emerald-light opacity-60">BOOKED</span>
              </div>
              <div className="flex flex-1 justify-around">
                {([[c.connected, "Conn."], [c.remaining, "Left"]] as const).map(([val, label]) => (
                  <div key={label} className="text-center">
                    <div className="text-xs font-semibold tabular-nums text-text-primary">{val}</div>
                    <div className="text-[8px] text-text-dim">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
