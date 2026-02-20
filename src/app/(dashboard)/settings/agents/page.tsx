import { getAgents } from "@/lib/queries/settings";
import { AgentsClient } from "./_components/agents-client";

export default async function AgentsPage() {
  const agents = await getAgents();
  return <AgentsClient agents={agents} />;
}
