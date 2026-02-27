import { createClient } from "@/lib/supabase/server";
import { getCalendarConnections, getConnectedCrm } from "@/lib/queries/integrations";
import { CampaignWizard } from "./_components/campaign-wizard";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const [agentsRes, calendarConnections, crmIntegration] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, agent_type, purpose_description")
      .in("status", ["active", "pending"])
      .order("name"),
    getCalendarConnections(),
    getConnectedCrm(),
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

  return (
    <CampaignWizard
      agents={agentList}
      calendarOptions={calendarOptions}
      hasCrm={!!crmIntegration}
    />
  );
}
