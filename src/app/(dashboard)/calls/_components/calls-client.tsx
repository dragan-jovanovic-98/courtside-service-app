"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  Search,
  ArrowDownLeft,
  PhoneOutgoing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { SectionLabel } from "@/components/ui/section-label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { EmptyState } from "@/components/ui/empty-state";
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

const OUTCOME_DB_VALUES: Record<string, string> = {
  Booked: "booked",
  Interested: "interested",
  Callback: "callback",
  Voicemail: "voicemail",
  "No Answer": "no_answer",
  "Not Interested": "not_interested",
  "Wrong Number": "wrong_number",
  DNC: "dnc",
};

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

const PAGE_SIZE = 100;

export function CallsClient({
  calls,
  stats,
  initialDetailId = null,
  totalCount = 0,
  currentPage = 1,
  campaignNames = [],
  currentFilters = { outcome: "all", campaign: "all", direction: "all", search: "" },
}: {
  calls: CallListItem[];
  stats: { total: number; today: number; connected: number; booked: number };
  initialDetailId?: string | null;
  totalCount?: number;
  currentPage?: number;
  campaignNames?: string[];
  currentFilters?: { outcome: string; campaign: string; direction: string; search: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!("page" in overrides)) {
        params.delete("page");
      }
      params.delete("id");

      for (const [key, value] of Object.entries(overrides)) {
        if (!value || value === "all" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      return `/calls${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  const handleOutcomeChange = useCallback(
    (displayValue: string) => {
      const dbValue = displayValue === "all" ? undefined : OUTCOME_DB_VALUES[displayValue] ?? displayValue;
      router.push(buildUrl({ outcome: dbValue }));
    },
    [router, buildUrl]
  );

  const handleCampaignChange = useCallback(
    (value: string) => {
      router.push(buildUrl({ campaign: value === "all" ? undefined : value }));
    },
    [router, buildUrl]
  );

  const handleDirChange = useCallback(
    (value: string) => {
      router.push(buildUrl({ direction: value === "all" ? undefined : value }));
    },
    [router, buildUrl]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        router.push(buildUrl({ search: value || undefined }));
      }, 400);
    },
    [router, buildUrl]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      router.push(buildUrl({ page: newPage > 1 ? String(newPage) : undefined }));
    },
    [router, buildUrl]
  );

  // Reverse-map db values to display labels
  const currentOutcomeDisplay =
    currentFilters.outcome === "all"
      ? "all"
      : Object.entries(OUTCOME_DB_VALUES).find(([, v]) => v === currentFilters.outcome)?.[0] ?? "all";

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
          <div className="mb-3 rounded-xl border border-border-default bg-surface-card p-5">
            <SectionLabel>Recording</SectionLabel>
            <audio
              controls
              src={call.recordingUrl}
              className="w-full [&::-webkit-media-controls-panel]:bg-[rgba(255,255,255,0.05)]"
              preload="metadata"
            />
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
        {call.leadId && (
          <div className="flex gap-2">
            <Button variant="ghost" asChild className="gap-1.5">
              <Link href={`/leads?id=${call.leadId}`}>
                <User size={13} /> View Lead
              </Link>
            </Button>
          </div>
        )}
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
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
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
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, phone number..."
            className="border-border-default bg-surface-input pl-[34px] text-text-primary placeholder:text-text-dim"
          />
        </div>
        <DropdownSelect
          label="Direction"
          value={currentFilters.direction}
          options={["outbound", "inbound"]}
          onChange={handleDirChange}
          allLabel="All"
        />
        <DropdownSelect
          label="Outcome"
          value={currentOutcomeDisplay}
          options={[...OUTCOMES]}
          onChange={handleOutcomeChange}
        />
        <DropdownSelect
          label="Campaign"
          value={currentFilters.campaign}
          options={campaignNames}
          onChange={handleCampaignChange}
        />
      </div>

      {/* Calls table */}
      {calls.length === 0 && currentFilters.outcome === "all" && currentFilters.campaign === "all" && currentFilters.direction === "all" && !currentFilters.search ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Start a campaign to begin calling your leads with AI."
          action={
            <Button asChild className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90">
              <Link href="/campaigns">View Campaigns</Link>
            </Button>
          }
        />
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-card">
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
            {calls.length > 0 ? (
              calls.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setDetailId(c.id)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                    i < calls.length - 1 && "border-b border-border-light"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-default px-4 py-3">
            <div className="text-xs text-text-dim">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="gap-1"
              >
                <ChevronLeft size={14} /> Prev
              </Button>
              <span className="text-xs text-text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="gap-1"
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
