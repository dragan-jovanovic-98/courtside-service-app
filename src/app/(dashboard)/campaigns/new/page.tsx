import { createClient } from "@/lib/supabase/server";
import { getCalendarConnections, getConnectedCrm } from "@/lib/queries/integrations";
import { getOrgContacts } from "@/lib/queries/contacts";
import { getVerification } from "@/lib/queries/settings";
import { CampaignWizard } from "./_components/campaign-wizard";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const [agentsRes, calendarConnections, crmIntegration, contacts, campaignsRes, verification] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, agent_type, purpose_description")
      .in("status", ["active", "pending"])
      .order("name"),
    getCalendarConnections(),
    getConnectedCrm(),
    getOrgContacts(),
    supabase
      .from("campaigns")
      .select("id, name")
      .order("name"),
    getVerification(),
  ]);

  const agentList = (agentsRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    tag: a.agent_type ?? "General",
    description: a.purpose_description ?? "",
  }));

  const calendarOptions = calendarConnections.map((cc) => {
    const integration = cc.integrations as { service_name: string; account_email?: string } | null;
    const provider = integration?.service_name === "google" ? "Google" : "Outlook";
    const displayName = cc.calendar_name === "Calendar" && integration?.account_email
      ? integration.account_email
      : cc.calendar_name;
    return { id: cc.id, label: `${displayName} (${provider})` };
  });

  const campaignList = (campaignsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const isVerified = verification?.status === "approved";

  return (
    <CampaignWizard
      agents={agentList}
      calendarOptions={calendarOptions}
      hasCrm={!!crmIntegration}
      contacts={contacts}
      existingCampaigns={campaignList}
      isVerified={isVerified}
    />
  );
}
