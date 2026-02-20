import {
  Skeleton,
  SkeletonStatCards,
  SkeletonCampaignCard,
} from "@/components/ui/skeleton";

export default function CampaignsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="mb-4">
        <SkeletonStatCards />
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>

      {/* Campaign cards */}
      <div className="flex flex-col gap-2.5">
        <SkeletonCampaignCard />
        <SkeletonCampaignCard />
        <SkeletonCampaignCard />
      </div>
    </div>
  );
}
