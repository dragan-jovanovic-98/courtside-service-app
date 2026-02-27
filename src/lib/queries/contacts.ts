import { createClient } from "@/lib/supabase/server";
import type { ContactForSelection } from "@/types";

export async function getOrgContacts(): Promise<ContactForSelection[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, phone, email, company, is_dnc, leads(campaign_id, status)"
    )
    .order("first_name");

  if (!data) return [];

  return data as ContactForSelection[];
}
