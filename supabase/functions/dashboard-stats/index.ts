import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

function getDateRange(range: string): string {
  const now = new Date();
  let days: number;

  switch (range) {
    case "7d":
      days = 7;
      break;
    case "90d":
      days = 90;
      break;
    case "30d":
    default:
      days = 30;
      break;
  }

  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start.toISOString();
}

function getStartOfDay(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getStartOfMonth(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    // Parse range from query params
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "30d";
    const rangeStart = getDateRange(range);

    const todayStart = getStartOfDay();
    const weekStart = getStartOfWeek();
    const monthStart = getStartOfMonth();

    // Run all queries in parallel
    const [
      appointmentsToday,
      appointmentsWeek,
      appointmentsMonth,
      callsByOutcome,
      leadsByStatus,
      activeCampaigns,
      totalCalls,
      callDurations,
    ] = await Promise.all([
      // Appointments today
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_at", todayStart),

      // Appointments this week
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_at", weekStart),

      // Appointments this month
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_at", monthStart),

      // Calls by outcome in date range
      supabase
        .from("calls")
        .select("outcome")
        .gte("started_at", rangeStart)
        .not("outcome", "is", null),

      // Leads by status
      supabase.from("leads").select("status"),

      // Active campaigns
      supabase
        .from("campaigns")
        .select("id, total_leads", { count: "exact" })
        .eq("status", "active"),

      // Total calls in date range
      supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .gte("started_at", rangeStart),

      // Call durations for total duration
      supabase
        .from("calls")
        .select("duration_seconds")
        .gte("started_at", rangeStart)
        .not("duration_seconds", "is", null),
    ]);

    // Aggregate calls by outcome
    const callsOutcomeMap: Record<string, number> = {};
    if (callsByOutcome.data) {
      for (const call of callsByOutcome.data) {
        const outcome = call.outcome as string;
        callsOutcomeMap[outcome] = (callsOutcomeMap[outcome] || 0) + 1;
      }
    }

    // Aggregate leads by status
    const leadsStatusMap: Record<string, number> = {};
    if (leadsByStatus.data) {
      for (const lead of leadsByStatus.data) {
        const status = lead.status as string;
        leadsStatusMap[status] = (leadsStatusMap[status] || 0) + 1;
      }
    }

    // Sum total leads across active campaigns
    let activeCampaignLeads = 0;
    if (activeCampaigns.data) {
      for (const campaign of activeCampaigns.data) {
        activeCampaignLeads += campaign.total_leads ?? 0;
      }
    }

    // Sum call durations
    let totalDurationSeconds = 0;
    if (callDurations.data) {
      for (const call of callDurations.data) {
        totalDurationSeconds += call.duration_seconds ?? 0;
      }
    }
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

    return jsonResponse({
      appointments: {
        today: appointmentsToday.count ?? 0,
        this_week: appointmentsWeek.count ?? 0,
        this_month: appointmentsMonth.count ?? 0,
      },
      calls_by_outcome: callsOutcomeMap,
      leads_by_status: leadsStatusMap,
      active_campaigns: activeCampaigns.count ?? 0,
      active_campaign_leads: activeCampaignLeads,
      total_calls: totalCalls.count ?? 0,
      total_duration_minutes: totalDurationMinutes,
    });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("dashboard-stats error:", error);
    return errorResponse(error.message, 500);
  }
});
