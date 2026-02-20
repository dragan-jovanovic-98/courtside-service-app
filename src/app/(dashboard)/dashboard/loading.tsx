import { Skeleton, SkeletonStatCards } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Action Zone */}
      <Skeleton className="mb-2 h-3 w-20" />

      {/* Appointments block */}
      <div className="mb-2.5 rounded-xl border border-border-default bg-surface-card">
        <div className="border-b border-border-default px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border-light px-4 py-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Action Items block */}
      <div className="mb-6 rounded-xl border border-border-default bg-surface-card">
        <div className="border-b border-border-default px-4 py-3">
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border-light px-4 py-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Results */}
      <Skeleton className="mb-3 h-3 w-16" />
      <SkeletonStatCards />

      {/* Engaged + Outcomes */}
      <div className="mb-3 mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>

      {/* Funnel */}
      <Skeleton className="mb-3.5 h-44 rounded-xl" />

      {/* Active Campaigns */}
      <Skeleton className="mb-2 h-3 w-32" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="hidden h-32 rounded-xl lg:block" />
      </div>
    </div>
  );
}
