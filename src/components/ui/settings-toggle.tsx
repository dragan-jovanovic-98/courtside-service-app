"use client";

import { cn } from "@/lib/utils";

interface SettingsToggleProps {
  label: string;
  subtitle?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export function SettingsToggle({
  label,
  subtitle,
  enabled,
  onChange,
  className,
}: SettingsToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border-light py-2.5",
        className
      )}
    >
      <div>
        <div className="text-[13px] text-text-primary">{label}</div>
        {subtitle && (
          <div className="mt-0.5 text-[11px] text-text-dim">{subtitle}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150",
          enabled ? "bg-emerald-dark" : "bg-[rgba(255,255,255,0.1)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 block h-4 w-4 rounded-full bg-white transition-[left] duration-150",
            enabled ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
