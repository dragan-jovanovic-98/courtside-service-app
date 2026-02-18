"use client";

import { Filter, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DropdownSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel?: string;
}

export function DropdownSelect({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: DropdownSelectProps) {
  const isFiltered = value !== "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-[7px] text-xs font-semibold transition-colors",
            isFiltered
              ? "border-[rgba(52,211,153,0.2)] bg-emerald-bg text-emerald-light"
              : "border-border-default bg-surface-input text-text-muted"
          )}
        >
          <Filter className="size-[11px]" />
          {label}: {isFiltered ? value : allLabel}
          <ChevronDown className="size-[10px] opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[160px] border-border-default bg-[#181b22]"
      >
        <DropdownMenuItem
          onClick={() => onChange("all")}
          className={cn(
            "text-xs",
            value === "all" && "font-bold text-emerald-light"
          )}
        >
          {allLabel}
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              "text-xs",
              value === option && "font-bold text-emerald-light"
            )}
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
