import { getAdminAgents } from "@/lib/queries/admin";
import { AgentListClient } from "./_components/agent-list-client";

export default async function AdminAgentsPage() {
  const agents = await getAdminAgents();

  return <AgentListClient agents={agents} />;
}
