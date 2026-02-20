import { createClient } from "@/lib/supabase/server";
import { CampaignWizard } from "./_components/campaign-wizard";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, agent_type, purpose_description")
    .in("status", ["active", "pending"])
    .order("name");

  const agentList = (agents ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    tag: a.agent_type ?? "General",
    description: a.purpose_description ?? "",
  }));

  return <CampaignWizard agents={agentList} />;
}
