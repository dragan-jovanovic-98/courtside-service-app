import { getUserProfile } from "@/lib/queries/settings";
import {
  getDashboardStats,
  getEngagedLeads,
  getCallOutcomes,
  getConversionFunnel,
  getTodaysAppointments,
  getActionItems,
  getActiveCampaigns,
} from "@/lib/queries/dashboard";
import { DashboardClient } from "./_components/dashboard-client";

type DateRange = "today" | "7d" | "30d" | "all";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (["today", "7d", "30d", "all"].includes(params.range ?? "")
    ? params.range
    : "7d") as DateRange;

  const [profile, stats, engaged, outcomes, funnel, appointments, actionItems, campaigns] =
    await Promise.all([
      getUserProfile(),
      getDashboardStats(range),
      getEngagedLeads(range),
      getCallOutcomes(range),
      getConversionFunnel(range),
      getTodaysAppointments(),
      getActionItems(),
      getActiveCampaigns(),
    ]);

  const firstName = profile?.first_name ?? "there";

  return (
    <DashboardClient
      userName={firstName}
      range={range}
      stats={stats}
      engaged={engaged}
      outcomes={outcomes}
      funnel={funnel}
      appointments={appointments}
      actionItems={actionItems}
      campaigns={campaigns}
    />
  );
}
