import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  DashboardAppointment,
  DashboardActionItem,
  DashboardCampaign,
  CallOutcomeCount,
  FunnelData,
  EngagedLeadsData,
  OrgRevenueSettings,
} from "@/types";
import { fullName, formatTime, formatRelativeTime } from "@/lib/format";

type DateRange = "today" | "7d" | "30d" | "all";

function rangeToDate(range: DateRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  const days = range === "7d" ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export async function getDashboardStats(
  range: DateRange
): Promise<DashboardStats> {
  const supabase = await createClient();
  const since = rangeToDate(range);

  let apptQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["appt_set", "showed"]);
  let pipelineQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["new", "contacted"]);
  if (since) {
    apptQuery = apptQuery.gte("status_changed_at", since);
  }

  const [apptRes, pipelineRes, durationRes] = await Promise.all([
    apptQuery,
    pipelineQuery,
    supabase.rpc("sum_call_duration", { since: since ?? undefined }),
  ]);

  const totalSeconds = (durationRes.data as number) ?? 0;
  const appointments = apptRes.count ?? 0;

  return {
    appointments,
    estRevenue: 0, // computed in page component using org settings + engaged data
    totalCallSeconds: totalSeconds,
    activePipeline: pipelineRes.count ?? 0,
  };
}

export async function getOrgRevenueSettings(): Promise<OrgRevenueSettings> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { averageOrderValue: 5000, bookedCloseRate: 0.10, interestedCloseRate: 0.05 };

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow) return { averageOrderValue: 5000, bookedCloseRate: 0.10, interestedCloseRate: 0.05 };

  const { data: org } = await supabase
    .from("organizations")
    .select("average_order_value, booked_close_rate, interested_close_rate")
    .eq("id", userRow.org_id)
    .single();

  return {
    averageOrderValue: org?.average_order_value ?? 5000,
    bookedCloseRate: org?.booked_close_rate ?? 0.10,
    interestedCloseRate: org?.interested_close_rate ?? 0.05,
  };
}

export async function getEngagedLeads(
  range: DateRange
): Promise<EngagedLeadsData> {
  const supabase = await createClient();
  const since = rangeToDate(range);

  let bookedQ = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("status", ["appt_set", "showed"]);
  let interestedQ = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "interested");

  if (since) {
    bookedQ = bookedQ.gte("status_changed_at", since);
    interestedQ = interestedQ.gte("status_changed_at", since);
  }

  const [bookedRes, interestedRes] = await Promise.all([
    bookedQ,
    interestedQ,
  ]);

  const bookedCount = bookedRes.count ?? 0;
  const interestedCount = interestedRes.count ?? 0;

  return {
    total: bookedCount + interestedCount,
    booked: bookedCount,
    interested: interestedCount,
  };
}

const OUTCOMES = [
  "booked",
  "interested",
  "callback",
  "voicemail",
  "no_answer",
  "not_interested",
  "wrong_number",
  "dnc",
] as const;

export async function getCallOutcomes(
  range: DateRange
): Promise<CallOutcomeCount[]> {
  const supabase = await createClient();
  const since = rangeToDate(range);

  const queries = OUTCOMES.map((outcome) => {
    let q = supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("outcome", outcome);
    if (since) q = q.gte("created_at", since);
    return q;
  });

  const results = await Promise.all(queries);

  return OUTCOMES.map((outcome, i) => ({
    outcome,
    count: results[i].count ?? 0,
  }));
}

export async function getConversionFunnel(
  range: DateRange
): Promise<FunnelData> {
  const supabase = await createClient();
  const since = rangeToDate(range);

  // Cohort funnel: leads created in the period, counted by how far they've progressed
  const base = () => {
    let q = supabase.from("leads").select("id", { count: "exact", head: true });
    if (since) q = q.gte("created_at", since);
    return q;
  };

  const [leads, contacted, interested, booked, showed, closed] =
    await Promise.all([
      base(),
      base().not("status", "eq", "new"),
      base().in("status", ["interested", "appt_set", "showed", "closed_won"]),
      base().in("status", ["appt_set", "showed", "closed_won"]),
      base().in("status", ["showed", "closed_won"]),
      base().eq("status", "closed_won"),
    ]);

  return {
    leads: leads.count ?? 0,
    contacted: contacted.count ?? 0,
    interested: interested.count ?? 0,
    booked: booked.count ?? 0,
    showed: showed.count ?? 0,
    closed: closed.count ?? 0,
  };
}

export async function getTodaysAppointments(): Promise<
  DashboardAppointment[]
> {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, contacts(first_name, last_name, phone, company), campaigns(name)"
    )
    .gte("scheduled_at", todayStart.toISOString())
    .lte("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at", { ascending: true });

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const contact = row.contacts as {
      first_name: string;
      last_name: string | null;
      phone: string;
      company: string | null;
    } | null;
    const campaign = row.campaigns as { name: string } | null;

    return {
      id: row.id as string,
      time: formatTime(row.scheduled_at as string),
      name: contact
        ? fullName(contact.first_name, contact.last_name)
        : "Unknown",
      company: contact?.company ?? null,
      campaign: campaign?.name ?? "—",
      phone: contact?.phone ?? "",
    };
  });
}

export async function getActionItems(): Promise<DashboardActionItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("action_items")
    .select("id, contact_id, lead_id, title, description, type, campaign_name, created_at, contacts(first_name, last_name), leads(campaign_id, campaigns(agent_id))")
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const contact = row.contacts as {
      first_name: string;
      last_name: string | null;
    } | null;
    const lead = row.leads as { campaign_id: string; campaigns: { agent_id: string | null } | null } | null;

    return {
      id: row.id as string,
      contact_id: row.contact_id as string,
      lead_id: (row.lead_id as string | null) ?? null,
      campaign_id: lead?.campaign_id ?? null,
      agent_id: lead?.campaigns?.agent_id ?? null,
      name: contact
        ? fullName(contact.first_name, contact.last_name)
        : "Unknown",
      reason: (row.description as string) ?? (row.title as string),
      campaign: row.campaign_name as string | null,
      time: formatRelativeTime(row.created_at as string),
      type: row.type as string,
    };
  });
}

export async function getActiveCampaigns(): Promise<DashboardCampaign[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaigns")
    .select("id, name, status, calls_made, total_leads, bookings, calls_connected, agents(name)")
    .in("status", ["active", "paused"])
    .order("updated_at", { ascending: false });

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const agent = row.agents as { name: string } | null;
    const callsMade = row.calls_made as number;
    const totalLeads = row.total_leads as number;

    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      callsMade,
      totalLeads,
      booked: row.bookings as number,
      connected: row.calls_connected as number,
      remaining: Math.max(0, totalLeads - callsMade),
      agentName: agent?.name ?? null,
    };
  });
}
