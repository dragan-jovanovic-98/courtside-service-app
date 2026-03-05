import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getConnectedCrm } from "@/lib/queries/integrations";
import { LeadsClient } from "./_components/leads-client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    status?: string;
    outcome?: string;
    source?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [{ data: leads, totalCount }, stats, campaigns, crmIntegration] =
    await Promise.all([
      getLeads({
        status: params.status,
        outcome: params.outcome,
        source: params.source,
        search: params.search,
        page,
      }),
      getLeadStats(),
      getCampaigns(),
      getConnectedCrm(),
    ]);

  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <LeadsClient
      leads={leads}
      stats={stats}
      campaigns={campaignOptions}
      hasCrm={!!crmIntegration}
      initialDetailId={params.id ?? null}
      totalCount={totalCount}
      currentPage={page}
      currentFilters={{
        status: params.status ?? "all",
        outcome: params.outcome ?? "all",
        source: params.source ?? "all",
        search: params.search ?? "",
      }}
    />
  );
}
