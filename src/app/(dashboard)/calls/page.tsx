import { getCalls, getCallStats } from "@/lib/queries/calls";
import { getCampaigns } from "@/lib/queries/campaigns";
import { CallsClient } from "./_components/calls-client";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    outcome?: string;
    campaign?: string;
    direction?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [{ data: calls, totalCount }, stats, campaigns] = await Promise.all([
    getCalls({
      outcome: params.outcome,
      campaign: params.campaign,
      direction: params.direction,
      search: params.search,
      page,
    }),
    getCallStats(),
    getCampaigns(),
  ]);

  const campaignNames = campaigns.map((c) => c.name);

  return (
    <CallsClient
      calls={calls}
      stats={stats}
      initialDetailId={params.id ?? null}
      totalCount={totalCount}
      currentPage={page}
      campaignNames={campaignNames}
      currentFilters={{
        outcome: params.outcome ?? "all",
        campaign: params.campaign ?? "all",
        direction: params.direction ?? "all",
        search: params.search ?? "",
      }}
    />
  );
}
