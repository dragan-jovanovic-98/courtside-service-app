import { Skeleton } from "@/components/ui/skeleton";

export default function NewCampaignLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stepper bar */}
      <div className="mb-8 flex items-center gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 w-16" />
            {i < 3 && <Skeleton className="h-px w-8" />}
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="rounded-xl border border-border-default bg-surface-card p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="mb-3 h-10 w-full rounded-lg" />
        <Skeleton className="mb-3 h-10 w-full rounded-lg" />
        <Skeleton className="mb-3 h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
