import { createClient } from "@/lib/supabase/server";

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function getOrganization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's org_id first
  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return null;

  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", userRow.org_id)
    .single();

  return data;
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's org_id
  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("org_id", userRow.org_id)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  return data ?? [];
}
