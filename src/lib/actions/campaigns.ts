"use server";

import { getCampaignSchedules } from "@/lib/queries/campaigns";

export async function fetchCampaignSchedules(campaignId: string) {
  return getCampaignSchedules(campaignId);
}
