import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { getCampaigns } from "@/lib/queries/campaigns";
import { LeadsClient } from "./_components/leads-client";

export default async function LeadsPage() {
  const [leads, stats, campaigns] = await Promise.all([
    getLeads(),
    getLeadStats(),
    getCampaigns(),
  ]);

  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  return <LeadsClient leads={leads} stats={stats} campaigns={campaignOptions} />;
}
