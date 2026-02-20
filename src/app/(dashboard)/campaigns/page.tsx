import { getCampaigns } from "@/lib/queries/campaigns";
import { CampaignsClient } from "./_components/campaigns-client";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return <CampaignsClient campaigns={campaigns} />;
}
