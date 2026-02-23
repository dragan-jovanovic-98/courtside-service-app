import { getAllOrganizationsForDropdown } from "@/lib/queries/admin";
import { CreateAgentClient } from "./_components/create-agent-client";

export default async function AdminNewAgentPage() {
  const organizations = await getAllOrganizationsForDropdown();

  return <CreateAgentClient organizations={organizations} />;
}
