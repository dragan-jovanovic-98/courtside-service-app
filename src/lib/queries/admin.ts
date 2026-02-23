import { createClient } from "@/lib/supabase/server";

// ── Dashboard Stats ──────────────────────────────────────────────────

export async function getAdminDashboardStats() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [orgs, activeSubs, calls30d, pendingVerifications] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("verification")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
  ]);

  return {
    totalOrganizations: orgs.count ?? 0,
    activeSubscriptions: activeSubs.count ?? 0,
    totalCalls30d: calls30d.count ?? 0,
    pendingVerifications: pendingVerifications.count ?? 0,
  };
}

export async function getRecentSignups(limit = 10) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("id, name, created_at, industry, users(email, first_name, last_name, role)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((org) => {
    const users = org.users as Array<{
      email: string;
      first_name: string;
      last_name: string | null;
      role: string;
    }>;
    const owner = users?.find((u) => u.role === "owner") ?? users?.[0];
    return {
      id: org.id,
      name: org.name,
      createdAt: org.created_at,
      industry: org.industry,
      ownerEmail: owner?.email ?? "—",
      ownerName: owner
        ? [owner.first_name, owner.last_name].filter(Boolean).join(" ")
        : "—",
    };
  });
}

export async function getRecentWorkflowErrors(limit = 10) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workflow_events")
    .select("id, event_type, status, error_message, payload, created_at, org_id")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

// ── Organizations ────────────────────────────────────────────────────

export async function getAdminOrganizations() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select(
      "id, name, industry, created_at, users(id, email, first_name, last_name, role), agents(id), verification(status)"
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((org) => {
    const users = (org.users ?? []) as Array<{
      id: string;
      email: string;
      first_name: string;
      last_name: string | null;
      role: string;
    }>;
    const agents = (org.agents ?? []) as Array<{ id: string }>;
    const verification = org.verification as Array<{ status: string }> | null;
    const owner = users.find((u) => u.role === "owner") ?? users[0];

    return {
      id: org.id,
      name: org.name,
      industry: org.industry,
      createdAt: org.created_at,
      ownerEmail: owner?.email ?? "—",
      ownerName: owner
        ? [owner.first_name, owner.last_name].filter(Boolean).join(" ")
        : "—",
      memberCount: users.length,
      agentCount: agents.length,
      verificationStatus: verification?.[0]?.status ?? "not_started",
    };
  });
}

export async function getAdminOrgDetail(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  return data;
}

export async function getAdminOrgMembers(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getAdminOrgAgents(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agents")
    .select("id, name, status, direction, total_calls, total_bookings")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAdminOrgCampaigns(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaigns")
    .select("id, name, status, total_leads, calls_made, bookings, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAdminOrgSubscription(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function getAdminOrgVerification(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("verification")
    .select("*")
    .eq("org_id", orgId)
    .limit(1)
    .single();

  return data;
}

// ── Agents ───────────────────────────────────────────────────────────

export async function getAdminAgents() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agents")
    .select(
      "id, name, status, direction, voice, phone_number, total_calls, total_bookings, org_id, created_at, organizations(name)"
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((agent) => ({
    ...agent,
    orgName: (agent.organizations as unknown as { name: string } | null)?.name ?? "—",
  }));
}

export async function getAllOrganizationsForDropdown() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name", { ascending: true });

  return data ?? [];
}

// ── Phone Numbers ────────────────────────────────────────────────────

export async function getAdminPhoneNumbers() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("phone_numbers")
    .select(
      "id, number, friendly_name, type, status, org_id, agent_id, assigned_to, total_calls_handled, total_texts_sent, created_at, organizations(name), agents(name)"
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((pn) => ({
    ...pn,
    orgName: (pn.organizations as unknown as { name: string } | null)?.name ?? null,
    agentName: (pn.agents as unknown as { name: string } | null)?.name ?? null,
  }));
}

// ── Billing ──────────────────────────────────────────────────────────

export async function getAdminBillingStats() {
  const supabase = await createClient();

  const [active, pastDue, canceled, allSubs] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled"),
    supabase
      .from("subscriptions")
      .select("price_monthly")
      .eq("status", "active"),
  ]);

  const mrr = (allSubs.data ?? []).reduce(
    (sum, s) => sum + (s.price_monthly ?? 0),
    0
  );

  return {
    mrr,
    active: active.count ?? 0,
    pastDue: pastDue.count ?? 0,
    canceled: canceled.count ?? 0,
  };
}

export async function getAdminSubscriptions() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, org_id, status, plan_name, price_monthly, call_minutes_used, call_minutes_limit, stripe_subscription_id, current_period_end, created_at, organizations(id, name, stripe_customer_id)"
    )
    .order("created_at", { ascending: false });

  type OrgJoin = { id: string; name: string; stripe_customer_id: string | null };
  return (data ?? []).map((sub) => ({
    ...sub,
    orgName: (sub.organizations as unknown as OrgJoin | null)?.name ?? "—",
    stripeCustomerId: (sub.organizations as unknown as OrgJoin | null)?.stripe_customer_id ?? null,
  }));
}

// ── Verification ─────────────────────────────────────────────────────

export async function getAdminVerifications(statusFilter?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("verification")
    .select("*, organizations(name)")
    .order("submitted_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;

  return (data ?? []).map((v) => ({
    ...v,
    orgName: (v.organizations as unknown as { name: string } | null)?.name ?? "—",
  }));
}

// ── System / Workflow Events ─────────────────────────────────────────

export async function getAdminWorkflowEvents(limit = 50) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workflow_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
