import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim",
        className
      )}
    >
      {children}
    </div>
  );
}
