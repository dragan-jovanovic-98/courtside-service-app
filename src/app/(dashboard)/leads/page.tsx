import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { LeadsClient } from "./_components/leads-client";

export default async function LeadsPage() {
  const [leads, stats] = await Promise.all([getLeads(), getLeadStats()]);

  return <LeadsClient leads={leads} stats={stats} />;
}
