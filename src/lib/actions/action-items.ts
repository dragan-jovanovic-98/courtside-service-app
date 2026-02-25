"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resolveActionItem(
  id: string,
  resolutionType: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("action_items")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_type: resolutionType as
        | "appointment_scheduled"
        | "followup_scheduled"
        | "not_interested"
        | "wrong_number"
        | "dismissed",
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function scheduleCallback({
  contactId,
  leadId,
  campaignId,
  scheduledAt,
  durationMinutes,
  notes,
}: {
  contactId: string;
  leadId: string;
  campaignId: string;
  scheduledAt: string;
  durationMinutes: number;
  notes: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get user's org_id
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "User profile not found" };

  const { error } = await supabase.from("appointments").insert({
    org_id: profile.org_id,
    contact_id: contactId,
    lead_id: leadId,
    campaign_id: campaignId,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    notes,
    status: "scheduled",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { success: true };
}

export async function unresolveActionItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("action_items")
    .update({
      is_resolved: false,
      resolved_at: null,
      resolution_type: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
