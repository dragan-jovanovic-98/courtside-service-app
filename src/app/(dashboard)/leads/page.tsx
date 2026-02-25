import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { getCampaigns } from "@/lib/queries/campaigns";
import { LeadsClient } from "./_components/leads-client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [leads, stats, campaigns, params] = await Promise.all([
    getLeads(),
    getLeadStats(),
    getCampaigns(),
    searchParams,
  ]);

  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <LeadsClient
      leads={leads}
      stats={stats}
      campaigns={campaignOptions}
      initialDetailId={params.id ?? null}
    />
  );
}
