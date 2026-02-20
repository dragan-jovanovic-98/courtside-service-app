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

export async function getAgents() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return [];

  // Get agents with campaign count
  const { data: agents } = await supabase
    .from("agents")
    .select("*, campaigns(id)")
    .eq("org_id", userRow.org_id)
    .order("created_at", { ascending: true });

  return (agents ?? []).map((a) => ({
    ...a,
    campaign_count: Array.isArray(a.campaigns) ? a.campaigns.length : 0,
    campaigns: undefined,
  }));
}

export async function getBillingData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return null;

  // Get active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("org_id", userRow.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get recent invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("org_id", userRow.org_id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get phone numbers for this org
  const { data: phoneNumbers } = await supabase
    .from("phone_numbers")
    .select("*")
    .eq("org_id", userRow.org_id)
    .order("created_at", { ascending: true });

  // Get usage: total call minutes this billing period
  const periodStart = subscription?.current_period_start ?? null;
  let totalCallMinutes = 0;

  const callsQuery = supabase
    .from("calls")
    .select("duration")
    .eq("org_id", userRow.org_id);

  if (periodStart) {
    callsQuery.gte("started_at", periodStart);
  }

  const { data: calls } = await callsQuery;
  if (calls) {
    totalCallMinutes = Math.round(
      calls.reduce((sum, c) => sum + (c.duration ?? 0), 0) / 60
    );
  }

  return {
    subscription: subscription ?? null,
    invoices: invoices ?? [],
    phoneNumbers: phoneNumbers ?? [],
    usage: {
      callMinutes: totalCallMinutes,
      phoneNumberCount: phoneNumbers?.length ?? 0,
    },
  };
}

export async function getVerification() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return null;

  const { data } = await supabase
    .from("verification")
    .select("*")
    .eq("org_id", userRow.org_id)
    .single();

  return data;
}

export async function getComplianceSettings(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("compliance_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  return data;
}

export async function getComplianceData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return null;

  // DNC count
  const { count: dncCount } = await supabase
    .from("dnc_list")
    .select("*", { count: "exact", head: true })
    .eq("org_id", userRow.org_id);

  // Most recent DNC entry
  const { data: latestDnc } = await supabase
    .from("dnc_list")
    .select("created_at")
    .eq("org_id", userRow.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Auto-added DNC (those with reason containing "opt-out" or "STOP")
  const { count: dncAutoAdded } = await supabase
    .from("dnc_list")
    .select("*", { count: "exact", head: true })
    .eq("org_id", userRow.org_id)
    .ilike("reason", "%opt-out%");

  return {
    dncCount: dncCount ?? 0,
    dncLastUpdated: latestDnc?.created_at ?? null,
    dncAutoAdded: dncAutoAdded ?? 0,
    orgId: userRow.org_id,
  };
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
