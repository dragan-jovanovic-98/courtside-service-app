"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  User,
  Search,
  Play,
  ArrowDownLeft,
  PhoneOutgoing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/utils";
import { outcomeBadgeColor } from "@/lib/design-tokens";
import type { CallListItem } from "@/types";

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

function DirIcon({ dir, size = 11 }: { dir: string; size?: number }) {
  return dir === "inbound" ? (
    <ArrowDownLeft size={size} className="text-blue-light" />
  ) : (
    <PhoneOutgoing size={size} className="text-emerald-light" />
  );
}

function outcomeKey(outcome: string): string {
  return outcome.toLowerCase().replace(/ /g, "_");
}

export function CallsClient({
  calls,
  stats,
}: {
  calls: CallListItem[];
  stats: { total: number; today: number; connected: number; booked: number };
}) {
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const campaigns = [
    ...new Set(calls.map((c) => c.campaign).filter((c) => c !== "—")),
  ];

  const filtered = calls.filter((c) => {
    const matchesSearch =
      !query ||
      (c.name + c.outcome + c.campaign + c.phone)
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesOutcome =
      outcomeFilter === "all" || outcomeKey(c.outcome) === outcomeKey(outcomeFilter);
    const matchesCampaign =
      campaignFilter === "all" || c.campaign === campaignFilter;
    const matchesDir = dirFilter === "all" || c.direction === dirFilter;
    return matchesSearch && matchesOutcome && matchesCampaign && matchesDir;
  });

  // Detail View
  if (detailId) {
    const call = calls.find((c) => c.id === detailId);
    if (!call) {
      setDetailId(null);
      return null;
    }

    const transcriptLines = call.transcriptText
      ? call.transcriptText.split("\n").filter(Boolean)
      : [];

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
            Call with {call.name}
          </h1>
          <DirIcon dir={call.direction} size={14} />
          <ColoredBadge
            color={outcomeBadgeColor[outcomeKey(call.outcome)] ?? "default"}
          >
            {call.outcome}
          </ColoredBadge>
        </div>

        {/* 5-stat header */}
        <div className="mb-4 grid grid-cols-5 gap-2.5">
          {(
            [
              ["Date", call.date],
              ["Phone", call.phone],
              ["Duration", call.duration],
              ["Agent", call.agent],
              ["Campaign", call.campaign],
            ] as const
          ).map(([label, val]) => (
            <div
              key={label}
              className="rounded-xl border border-border-default bg-surface-card p-3.5"
            >
              <div className="text-[11px] text-text-dim">{label}</div>
              <div className="mt-1 text-[13px] font-semibold tabular-nums text-text-primary">
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        {call.aiSummary && (
          <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-5">
            <SectionLabel>AI Summary</SectionLabel>
            <p className="text-[13px] leading-relaxed text-text-muted">
              {call.aiSummary}
            </p>
          </div>
        )}

        {/* Recording player */}
        {call.recordingUrl && (
          <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-4">
            <div className="flex items-center gap-3">
              <button className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-bg-strong">
                <Play size={14} className="ml-0.5 text-emerald-light" />
              </button>
              <div className="flex-1">
                <div className="mb-1.5 h-1 overflow-hidden rounded-sm bg-[rgba(255,255,255,0.06)]">
                  <div className="h-full w-0 rounded-sm bg-emerald-light" />
                </div>
                <div className="flex justify-between text-[10px] tabular-nums text-text-dim">
                  <span>0:00</span>
                  <span>{call.duration}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcriptLines.length > 0 && (
          <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-5">
            <SectionLabel>Transcript</SectionLabel>
            {transcriptLines.map((line, i) => {
              const isAgent =
                line.startsWith("Agent:") || line.startsWith("AI:");
              const speaker = isAgent ? "Agent" : "Lead";
              const text = line
                .replace(/^(Agent|AI|Lead|User|Customer):\s*/i, "")
                .trim();
              return (
                <div key={i} className="mb-3 flex gap-2.5">
                  <span
                    className={cn(
                      "w-12 shrink-0 text-xs font-bold",
                      isAgent ? "text-emerald-light" : "text-blue-light"
                    )}
                  >
                    {speaker}
                  </span>
                  <span className="text-[13px] leading-relaxed text-text-muted">
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
            <Phone size={13} /> Call Again
          </Button>
          <Button variant="ghost" asChild className="gap-1.5">
            <Link href="/leads">
              <User size={13} /> View Lead
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Calls</h1>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {(
          [
            [stats.total, "Total Calls", "text-text-primary"],
            [stats.today, "Today", "text-blue-light"],
            [stats.connected, "Connected", "text-emerald-light"],
            [stats.booked, "Booked", "text-amber-light"],
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

      {/* Search + Filters */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone number, outcome..."
            className="border-border-default bg-surface-input pl-[34px] text-text-primary placeholder:text-text-dim"
          />
        </div>
        <DropdownSelect
          label="Direction"
          value={dirFilter}
          options={["outbound", "inbound"]}
          onChange={setDirFilter}
          allLabel="All"
        />
        <DropdownSelect
          label="Outcome"
          value={outcomeFilter}
          options={[...OUTCOMES]}
          onChange={setOutcomeFilter}
        />
        <DropdownSelect
          label="Campaign"
          value={campaignFilter}
          options={campaigns}
          onChange={setCampaignFilter}
        />
      </div>

      {/* Calls table */}
      <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              {[
                "",
                "Date",
                "Lead",
                "Phone",
                "Agent",
                "Dur.",
                "Outcome",
                "Campaign",
              ].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-text-dim",
                    h === "" && "w-6"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setDetailId(c.id)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                    i < filtered.length - 1 && "border-b border-border-light"
                  )}
                >
                  <td className="py-2.5 pl-3 pr-2">
                    <DirIcon dir={c.direction} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-dim">
                    {c.date}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-[13px] font-semibold",
                      c.name === "Unknown"
                        ? "text-text-dim"
                        : "text-text-primary"
                    )}
                  >
                    {c.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-text-muted">
                    {c.phone}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-muted">
                    {c.agent}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-text-muted">
                    {c.duration}
                  </td>
                  <td className="px-3 py-2.5">
                    <ColoredBadge
                      color={
                        outcomeBadgeColor[outcomeKey(c.outcome)] ?? "default"
                      }
                    >
                      {c.outcome}
                    </ColoredBadge>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-text-dim">
                    {c.campaign}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-[13px] text-text-dim"
                >
                  No calls match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
