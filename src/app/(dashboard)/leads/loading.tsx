import {
  Skeleton,
  SkeletonStatCards,
  SkeletonSearchBar,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <SkeletonStatCards />
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex-1">
          <SkeletonSearchBar />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
