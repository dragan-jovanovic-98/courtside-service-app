import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getConnectedCrm } from "@/lib/queries/integrations";
import { LeadsClient } from "./_components/leads-client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [leads, stats, campaigns, crmIntegration, params] = await Promise.all([
    getLeads(),
    getLeadStats(),
    getCampaigns(),
    getConnectedCrm(),
    searchParams,
  ]);

  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <LeadsClient
      leads={leads}
      stats={stats}
      campaigns={campaignOptions}
      hasCrm={!!crmIntegration}
      initialDetailId={params.id ?? null}
    />
  );
}
