import { getUserProfile } from "@/lib/supabase/auth";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const profile = await getUserProfile();
  const firstName = profile?.first_name ?? "there";

  return <DashboardClient userName={firstName} />;
}
