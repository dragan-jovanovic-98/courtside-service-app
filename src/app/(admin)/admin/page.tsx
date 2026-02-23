import {
  getAdminDashboardStats,
  getRecentSignups,
  getRecentWorkflowErrors,
} from "@/lib/queries/admin";
import { AdminDashboardClient } from "./_components/admin-dashboard-client";

export default async function AdminHomePage() {
  const [stats, recentSignups, recentErrors] = await Promise.all([
    getAdminDashboardStats(),
    getRecentSignups(10),
    getRecentWorkflowErrors(10),
  ]);

  return (
    <AdminDashboardClient
      stats={stats}
      recentSignups={recentSignups}
      recentErrors={recentErrors}
    />
  );
}
