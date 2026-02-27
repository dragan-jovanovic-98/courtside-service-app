import { createClient } from "@/lib/supabase/server";
import { getCampaigns } from "@/lib/queries/campaigns";
import { getCalendarConnections } from "@/lib/queries/integrations";
import { getVerification } from "@/lib/queries/settings";
import { CampaignsClient } from "./_components/campaigns-client";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const [campaigns, verification, agentsRes, calendarConnections] = await Promise.all([
    getCampaigns({ includeArchived: true }),
    getVerification(),
    supabase
      .from("agents")
      .select("id, name")
      .in("status", ["active", "pending"])
      .order("name"),
    getCalendarConnections(),
  ]);

  const isVerified = verification?.status === "approved";

  const agentList = (agentsRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const calendarOptions = calendarConnections.map((cc) => {
    const integration = cc.integrations as { service_name: string; account_email?: string } | null;
    const provider = integration?.service_name === "google" ? "Google" : "Outlook";
    const displayName = cc.calendar_name === "Calendar" && integration?.account_email
      ? integration.account_email
      : cc.calendar_name;
    return { id: cc.id, label: `${displayName} (${provider})` };
  });

  return (
    <CampaignsClient
      campaigns={campaigns}
      isVerified={isVerified}
      agents={agentList}
      calendarOptions={calendarOptions}
    />
  );
}
