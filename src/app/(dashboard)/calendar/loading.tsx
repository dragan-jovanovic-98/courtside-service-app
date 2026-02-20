import { Skeleton, SkeletonStatCards } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <Skeleton className="mb-2 h-7 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Stats */}
      <div className="mb-4">
        <SkeletonStatCards />
      </div>

      {/* Calendar grid */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border-default bg-surface-card">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border-default">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="p-2 text-center">
              <Skeleton className="mx-auto h-3 w-8" />
            </div>
          ))}
        </div>
        {/* Grid cells — 5 rows x 7 cols */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }, (_, i) => (
            <div
              key={i}
              className="min-h-[86px] border-b border-r border-border-light p-1.5"
            >
              <Skeleton className="mb-1 h-3 w-4" />
              {i % 5 === 0 && <Skeleton className="h-4 w-full rounded-sm" />}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <Skeleton className="mb-2 h-3 w-32" />
      <div className="rounded-xl border border-border-default bg-surface-card">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border-light px-4 py-3"
          >
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-7 w-[3px] rounded-sm" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
