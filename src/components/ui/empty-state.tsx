import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-surface-card px-6 py-16 text-center">
      <Icon size={40} className="mb-4 text-text-dim opacity-40" />
      <h3 className="mb-1.5 text-[15px] font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mb-5 max-w-[280px] text-[13px] text-text-dim">
        {description}
      </p>
      {action}
    </div>
  );
}
