"use client";

import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface ActionOption {
  label: string;
  icon?: ReactNode;
  color?: string;
  onClick: () => void;
}

interface ActionDropdownProps {
  label: string;
  icon?: ReactNode;
  options: ActionOption[];
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function ActionDropdown({
  label,
  icon,
  options,
  variant = "ghost",
}: ActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5 text-[11px]">
          {icon}
          {label}
          <ChevronDown className="size-2.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[190px] border-border-default bg-[#181b22]"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.label}
            onClick={option.onClick}
            className="gap-2 text-xs"
          >
            {option.icon && (
              <span
                className="flex"
                style={{ color: option.color || undefined }}
              >
                {option.icon}
              </span>
            )}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
