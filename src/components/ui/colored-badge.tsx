import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type BadgeColor } from "@/lib/design-tokens";

const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
  default: {
    bg: "bg-[rgba(255,255,255,0.08)]",
    text: "text-[rgba(255,255,255,0.6)]",
  },
  emerald: {
    bg: "bg-emerald-bg-strong",
    text: "text-emerald-light",
  },
  amber: {
    bg: "bg-amber-bg",
    text: "text-amber-light",
  },
  blue: {
    bg: "bg-blue-bg",
    text: "text-blue-light",
  },
  red: {
    bg: "bg-red-bg",
    text: "text-red-light",
  },
  purple: {
    bg: "bg-purple-bg",
    text: "text-purple-light",
  },
};

interface ColoredBadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

export function ColoredBadge({
  children,
  color = "default",
  className,
}: ColoredBadgeProps) {
  const colors = colorMap[color];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        colors.bg,
        colors.text,
        className
      )}
    >
      {children}
    </span>
  );
}
