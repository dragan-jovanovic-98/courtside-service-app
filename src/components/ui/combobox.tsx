"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

/* ── Combobox ─────────────────────────────────────────────────────── */

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  /** Size variant */
  size?: "sm" | "default";
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  size = "default",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value]
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 text-sm text-text-primary outline-none transition-colors",
            "hover:border-[rgba(255,255,255,0.12)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            size === "default" ? "h-9 py-2" : "h-8 py-1.5 text-xs",
            !value && "text-text-dim",
            className
          )}
        >
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-dim" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-border-default bg-[#1a1f2b] shadow-[0_8px_30px_rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={4}
          align="start"
        >
          <CommandPrimitive className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border-default px-3 py-2">
              <Search className="size-4 shrink-0 text-text-dim" />
              <CommandPrimitive.Input
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim"
              />
            </div>
            <CommandPrimitive.List className="max-h-60 overflow-y-auto p-1">
              <CommandPrimitive.Empty className="px-2 py-4 text-center text-sm text-text-dim">
                {emptyMessage}
              </CommandPrimitive.Empty>
              {options.map((option) => (
                <CommandPrimitive.Item
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                  className="relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm text-text-primary outline-hidden select-none hover:bg-[rgba(255,255,255,0.06)] data-[selected]:bg-[rgba(255,255,255,0.06)]"
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && (
                    <Check className="absolute right-2 size-4 text-emerald-light" />
                  )}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
