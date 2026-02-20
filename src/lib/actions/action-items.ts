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
