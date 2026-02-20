"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({
      first_name: formData.get("firstName") as string,
      last_name: formData.get("lastName") as string,
      phone: formData.get("phone") as string,
      timezone: formData.get("timezone") as string,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  return { success: true };
}

export async function updateNotificationPreferences(preferences: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        preferences: preferences as unknown as import("@/types").Json,
      },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  return { success: true };
}

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get user's org_id
  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return { error: "User not found" };

  const { error } = await supabase
    .from("organizations")
    .update({
      name: formData.get("name") as string,
      industry: formData.get("industry") as string,
      business_type: formData.get("businessType") as string,
      business_phone: formData.get("phone") as string,
      website: formData.get("website") as string,
      address: formData.get("address") as string,
    })
    .eq("id", userRow.org_id);

  if (error) return { error: error.message };

  revalidatePath("/settings/organization");
  return { success: true };
}

export async function inviteTeamMember(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is owner/admin
  const { data: caller } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!caller || !["owner", "admin"].includes(caller.role))
    return { error: "Insufficient permissions" };

  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) ?? "member";

  // Use Supabase Admin API to invite the user via email
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inviteData, error: inviteError } =
    await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        org_id: caller.org_id,
        role,
        invited_by: user.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    });

  if (inviteError) return { error: inviteError.message };

  // Create the user row linked to the invited auth user
  if (inviteData?.user) {
    const { error: insertError } = await adminSupabase.from("users").insert({
      id: inviteData.user.id,
      email,
      first_name: email.split("@")[0],
      org_id: caller.org_id,
      role: role as "member" | "admin",
      status: "invited",
    });

    if (insertError) {
      console.error("Failed to create user row for invite:", insertError.message);
      // Don't fail — the auth invite was sent, user row can be created on first login
    }
  }

  revalidatePath("/settings/team");
  return { success: true };
}

export async function updateComplianceSettings(settings: {
  casl_enabled: boolean;
  auto_sms_stop: boolean;
  auto_verbal_dnc: boolean;
  auto_email_unsub: boolean;
  national_dnc_check: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return { error: "User not found" };

  const { error } = await supabase
    .from("compliance_settings")
    .upsert(
      {
        org_id: userRow.org_id,
        ...settings,
      },
      { onConflict: "org_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/settings/compliance");
  return { success: true };
}

export async function removeTeamMember(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is owner/admin
  const { data: caller } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!caller || !["owner", "admin"].includes(caller.role))
    return { error: "Insufficient permissions" };

  // Verify target is in same org and not owner
  const { data: target } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", userId)
    .single();

  if (!target || target.org_id !== caller.org_id)
    return { error: "User not found" };

  if (target.role === "owner")
    return { error: "Cannot remove the organization owner" };

  const { error } = await supabase
    .from("users")
    .update({ status: "inactive" })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}
