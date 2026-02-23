import { getAdminOrganizations } from "@/lib/queries/admin";
import { OrgListClient } from "./_components/org-list-client";

export default async function AdminOrganizationsPage() {
  const organizations = await getAdminOrganizations();

  return <OrgListClient organizations={organizations} />;
}
