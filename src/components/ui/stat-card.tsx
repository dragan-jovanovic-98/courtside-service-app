"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accent: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-default bg-surface-card p-4 transition-all hover:bg-surface-card-hover",
        className
      )}
      style={{ borderTop: `2px solid ${accent}40` }}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="opacity-70" style={{ color: accent }}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
          {label}
        </span>
      </div>
      <div className="text-[26px] font-bold tabular-nums text-text-primary">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-text-dim">{subtitle}</div>
      )}
    </div>
  );
}
