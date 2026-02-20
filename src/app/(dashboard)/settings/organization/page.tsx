import { getOrganization } from "@/lib/queries/settings";
import { OrganizationClient } from "./_components/organization-client";

export default async function OrganizationPage() {
  const org = await getOrganization();

  return <OrganizationClient org={org} />;
}
