"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLeadCalls } from "@/lib/queries/leads";
import type { LeadCallItem } from "@/types";

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .update({
      status: status as
        | "new"
        | "contacted"
        | "interested"
        | "appt_set"
        | "showed"
        | "closed_won"
        | "closed_lost"
        | "bad_lead",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function fetchLeadCalls(leadId: string): Promise<LeadCallItem[]> {
  return getLeadCalls(leadId);
}

export async function addLeadsFromContacts(
  contactIds: string[],
  campaignId: string
): Promise<{ imported: number; duplicates: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { imported: 0, duplicates: 0, error: "Not authenticated" };

  // Get the user's org_id
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id)
    return { imported: 0, duplicates: 0, error: "No organization found" };

  // Filter out DNC contacts
  const { data: validContacts } = await supabase
    .from("contacts")
    .select("id")
    .in("id", contactIds)
    .eq("org_id", userData.org_id)
    .eq("is_dnc", false);

  if (!validContacts || validContacts.length === 0)
    return { imported: 0, duplicates: 0 };

  const rows = validContacts.map((c) => ({
    contact_id: c.id,
    campaign_id: campaignId,
    org_id: userData.org_id,
    status: "new" as const,
    import_source: "existing",
  }));

  // Use upsert with ignoreDuplicates to handle (contact_id, campaign_id) unique constraint
  const { data: inserted, error } = await supabase
    .from("leads")
    .upsert(rows, { onConflict: "contact_id,campaign_id", ignoreDuplicates: true })
    .select("id");

  if (error) return { imported: 0, duplicates: 0, error: error.message };

  const imported = inserted?.length ?? 0;
  const duplicates = validContacts.length - imported;

  revalidatePath("/leads");
  revalidatePath("/campaigns");
  return { imported, duplicates };
}
