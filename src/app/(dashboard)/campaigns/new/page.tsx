import { createClient } from "@/lib/supabase/server";
import { getCalendarConnections, getConnectedCrm } from "@/lib/queries/integrations";
import { getOrgContacts } from "@/lib/queries/contacts";
import { CampaignWizard } from "./_components/campaign-wizard";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const [agentsRes, calendarConnections, crmIntegration, contacts, campaignsRes] = await Promise.all([
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
  ]);

  const agentList = (agentsRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    tag: a.agent_type ?? "General",
    description: a.purpose_description ?? "",
  }));

  const calendarOptions = calendarConnections.map((cc) => ({
    id: cc.id,
    label: `${cc.calendar_name} (${(cc.integrations as { service_name: string } | null)?.service_name === "google" ? "Google" : "Outlook"})`,
  }));

  const campaignList = (campaignsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <CampaignWizard
      agents={agentList}
      calendarOptions={calendarOptions}
      hasCrm={!!crmIntegration}
      contacts={contacts}
      existingCampaigns={campaignList}
    />
  );
}
