import { redirect } from "next/navigation";
import {
  getAdminOrgDetail,
  getAdminOrgMembers,
  getAdminOrgAgents,
  getAdminOrgCampaigns,
  getAdminOrgSubscription,
  getAdminOrgVerification,
} from "@/lib/queries/admin";
import { OrgDetailClient } from "./_components/org-detail-client";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [org, members, agents, campaigns, subscription, verification] =
    await Promise.all([
      getAdminOrgDetail(id),
      getAdminOrgMembers(id),
      getAdminOrgAgents(id),
      getAdminOrgCampaigns(id),
      getAdminOrgSubscription(id),
      getAdminOrgVerification(id),
    ]);

  if (!org) {
    redirect("/admin/organizations");
  }

  return (
    <OrgDetailClient
      org={org}
      members={members}
      agents={agents}
      campaigns={campaigns}
      subscription={subscription}
      verification={verification}
    />
  );
}
