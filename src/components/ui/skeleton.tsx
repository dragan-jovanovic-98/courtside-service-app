import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[rgba(255,255,255,0.06)]",
        className
      )}
      style={style}
    />
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border-default bg-surface-card px-4 py-3"
        >
          <Skeleton className="mb-2 h-6 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
      {/* Header */}
      <div className="flex gap-4 border-b border-border-default px-4 py-3">
        {[120, 80, 60, 60, 50, 70].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            i < rows - 1 && "border-b border-border-light"
          )}
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCampaignCard() {
  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-3 h-1.5 w-full rounded-full" />
      <div className="flex gap-3">
        <Skeleton className="h-14 w-20 rounded-lg" />
        <div className="flex flex-1 justify-around">
          <Skeleton className="h-8 w-10" />
          <Skeleton className="h-8 w-10" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSearchBar() {
  return <Skeleton className="h-10 w-full rounded-lg" />;
}
