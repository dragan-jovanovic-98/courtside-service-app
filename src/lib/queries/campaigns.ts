import { createClient } from "@/lib/supabase/server";
import type { CampaignWithAgent } from "@/types";

export async function getCampaigns({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<CampaignWithAgent[]> {
  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select("*, agents(id, name, status, direction)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data } = await query;

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
