import { getCampaigns } from "@/lib/queries/campaigns";
import { getVerification } from "@/lib/queries/settings";
import { CampaignsClient } from "./_components/campaigns-client";

export default async function CampaignsPage() {
  const [campaigns, verification] = await Promise.all([
    getCampaigns({ includeArchived: true }),
    getVerification(),
  ]);

  const isVerified = verification?.status === "approved";

  return <CampaignsClient campaigns={campaigns} isVerified={isVerified} />;
}
