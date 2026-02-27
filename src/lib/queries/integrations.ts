import { createClient } from "@/lib/supabase/server";

/**
 * Get all integrations for the current user's org.
 */
export async function getIntegrations() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching integrations:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all calendar connections for the current user's org.
 */
export async function getCalendarConnections() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*, integrations(id, service_name, account_email, status)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching calendar connections:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get the connected CRM integration (if any) for the current org.
 */
export async function getConnectedCrm() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("service_type", "crm")
    .eq("status", "connected")
    .maybeSingle();

  if (error) {
    console.error("Error fetching CRM integration:", error);
    return null;
  }

  return data;
}

/**
 * Get connected calendar integrations (Google/Outlook) for the current org.
 */
export async function getConnectedCalendars() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", profile.org_id)
    .eq("service_type", "calendar")
    .eq("status", "connected")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching calendar integrations:", error);
    return [];
  }

  return data ?? [];
}
