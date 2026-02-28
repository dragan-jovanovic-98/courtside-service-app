import { getUserProfile } from "@/lib/queries/settings";
import {
  getDashboardStats,
  getEngagedLeads,
  getCallOutcomes,
  getConversionFunnel,
  getTodaysAppointments,
  getActionItems,
  getActiveCampaigns,
  getOrgRevenueSettings,
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

  const [profile, stats, engaged, outcomes, funnel, appointments, actionItems, campaigns, revenueSettings] =
    await Promise.all([
      getUserProfile(),
      getDashboardStats(range),
      getEngagedLeads(range),
      getCallOutcomes(range),
      getConversionFunnel(range),
      getTodaysAppointments(),
      getActionItems(),
      getActiveCampaigns(),
      getOrgRevenueSettings(),
    ]);

  const firstName = profile?.first_name ?? "there";

  // Compute est. revenue from engaged leads + org close rates
  const estRevenue = Math.round(
    (engaged.booked * revenueSettings.bookedCloseRate * revenueSettings.averageOrderValue) +
    (engaged.interested * revenueSettings.interestedCloseRate * revenueSettings.averageOrderValue)
  );
  stats.estRevenue = estRevenue;

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
