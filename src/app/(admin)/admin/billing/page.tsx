import { getAdminBillingStats, getAdminSubscriptions } from "@/lib/queries/admin";
import { BillingClient } from "./_components/billing-client";

export default async function AdminBillingPage() {
  const [stats, subscriptions] = await Promise.all([
    getAdminBillingStats(),
    getAdminSubscriptions(),
  ]);

  return <BillingClient stats={stats} subscriptions={subscriptions} />;
}
