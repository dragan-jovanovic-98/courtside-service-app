import { createClient } from "@/lib/supabase/server";
import type { CampaignWithAgent } from "@/types";

export async function getCampaigns(): Promise<CampaignWithAgent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaigns")
    .select("*, agents(id, name, status, direction)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data as CampaignWithAgent[]) ?? [];
}

export async function getCampaignById(
  id: string
): Promise<CampaignWithAgent | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaigns")
    .select("*, agents(id, name, status, direction)")
    .eq("id", id)
    .single();

  return data as CampaignWithAgent | null;
}
