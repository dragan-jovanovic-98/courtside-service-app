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
