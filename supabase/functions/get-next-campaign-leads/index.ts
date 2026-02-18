import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

// ── Constants ──────────────────────────────────────────────────────

const MAX_ORG_CONCURRENCY = 8;

// ── Types ──────────────────────────────────────────────────────────

interface CampaignBatch {
  campaign_id: string;
  campaign_name: string;
  agent_id: string;
  retell_agent_id: string;
  leads: LeadToCall[];
}

interface LeadToCall {
  lead_id: string;
  contact_id: string;
  contact_phone: string;
  contact_name: string;
  retry_count: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function isWithinScheduleWindow(
  schedules: Array<{ day_of_week: number; enabled: boolean; slots: Array<{ start: string; end: string }> }>,
  nowInTimezone: Date
): boolean {
  const dayOfWeek = nowInTimezone.getDay(); // 0=Sun, 6=Sat
  const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);

  if (!schedule || !schedule.enabled) return false;

  const currentTime =
    nowInTimezone.getHours().toString().padStart(2, "0") +
    ":" +
    nowInTimezone.getMinutes().toString().padStart(2, "0");

  return schedule.slots.some(
    (slot: { start: string; end: string }) =>
      currentTime >= slot.start && currentTime < slot.end
  );
}

function getNowInTimezone(timezone: string): Date {
  const nowUtc = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(nowUtc);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "0";

  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
  );
}

function getStartOfDayInTimezone(timezone: string): string {
  const now = getNowInTimezone(timezone);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

// ── Main handler ───────────────────────────────────────────────────
// Called by N8N cron every 2 minutes. Uses service role auth.
// Returns a list of leads to call, grouped by campaign.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // ── Auth: service role or webhook secret ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");

    if (token !== serviceRoleKey && token !== webhookSecret) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createServiceClient();

    // ── Get all active campaigns ──
    const { data: campaigns, error: campError } = await supabase
      .from("campaigns")
      .select(
        "id, name, org_id, agent_id, daily_call_limit, max_retries, retry_interval_hours, timezone"
      )
      .eq("status", "active");

    if (campError) {
      console.error("Failed to fetch campaigns:", campError.message);
      return errorResponse("Failed to fetch campaigns", 500);
    }

    if (!campaigns || campaigns.length === 0) {
      return jsonResponse({ batches: [], message: "No active campaigns" });
    }

    // ── Group campaigns by org ──
    const orgCampaigns = new Map<string, typeof campaigns>();
    for (const c of campaigns) {
      const list = orgCampaigns.get(c.org_id) || [];
      list.push(c);
      orgCampaigns.set(c.org_id, list);
    }

    const allBatches: CampaignBatch[] = [];
    const skippedReasons: Array<{ campaign_id: string; reason: string }> = [];

    // ── Process each org ──
    for (const [orgId, orgCamps] of orgCampaigns) {
      // Count likely in-progress calls for this org.
      // Since we only receive the post-call analysis webhook (not start/end
      // separately), we estimate active calls as: initiated in the last
      // 10 minutes with no outcome yet. This acts as a TTL — if a call was
      // started 10+ min ago with no analysis, we assume it's done or failed.
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { count: activeCalls } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("started_at", tenMinAgo)
        .is("outcome", null);

      const currentActive = activeCalls ?? 0;
      let orgSlotsRemaining = MAX_ORG_CONCURRENCY - currentActive;

      if (orgSlotsRemaining <= 0) {
        for (const c of orgCamps) {
          skippedReasons.push({
            campaign_id: c.id,
            reason: `Org at max concurrency (${MAX_ORG_CONCURRENCY})`,
          });
        }
        continue;
      }

      // ── Process each campaign for this org ──
      for (const campaign of orgCamps) {
        if (orgSlotsRemaining <= 0) break;

        const timezone = campaign.timezone || "America/New_York";
        const nowTz = getNowInTimezone(timezone);

        // ── Check schedule window ──
        const { data: schedules } = await supabase
          .from("campaign_schedules")
          .select("day_of_week, enabled, slots")
          .eq("campaign_id", campaign.id);

        if (!schedules || !isWithinScheduleWindow(schedules, nowTz)) {
          skippedReasons.push({
            campaign_id: campaign.id,
            reason: "Outside schedule window",
          });
          continue;
        }

        // ── Check daily call limit ──
        const todayStart = getStartOfDayInTimezone(timezone);

        const { count: callsToday } = await supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .gte("started_at", todayStart);

        const dailyRemaining =
          (campaign.daily_call_limit ?? 100) - (callsToday ?? 0);

        if (dailyRemaining <= 0) {
          skippedReasons.push({
            campaign_id: campaign.id,
            reason: "Daily call limit reached",
          });
          continue;
        }

        // ── Validate agent ──
        const { data: agent } = await supabase
          .from("agents")
          .select("id, retell_agent_id, status")
          .eq("id", campaign.agent_id)
          .single();

        if (!agent || agent.status !== "active" || !agent.retell_agent_id) {
          skippedReasons.push({
            campaign_id: campaign.id,
            reason: "Agent not active or not configured in Retell",
          });
          continue;
        }

        // ── Calculate batch size ──
        const batchSize = Math.min(orgSlotsRemaining, dailyRemaining);

        // ── Select eligible leads ──
        // Eligible: status in (new, contacted), retry_count < max_retries,
        // and last_activity_at is either null or older than retry_interval_hours
        const retryIntervalMs =
          (campaign.retry_interval_hours ?? 24) * 60 * 60 * 1000;
        const retryThreshold = new Date(
          Date.now() - retryIntervalMs
        ).toISOString();
        const maxRetries = campaign.max_retries ?? 3;

        // Query leads that are eligible for calling
        // We need: status in (new, contacted), retry_count < max_retries
        // AND (last_activity_at IS NULL OR last_activity_at < retryThreshold)
        const { data: eligibleLeads, error: leadsError } = await supabase
          .from("leads")
          .select(
            "id, contact_id, retry_count, status, contacts(id, phone, first_name, last_name, is_dnc)"
          )
          .eq("campaign_id", campaign.id)
          .eq("org_id", orgId)
          .in("status", ["new", "contacted"])
          .lt("retry_count", maxRetries)
          .or(`last_activity_at.is.null,last_activity_at.lt.${retryThreshold}`)
          .order("retry_count", { ascending: true }) // New leads first (0 retries)
          .order("created_at", { ascending: true }) // Then oldest first
          .limit(batchSize);

        if (leadsError) {
          console.error(
            `Failed to fetch leads for campaign ${campaign.id}:`,
            leadsError.message
          );
          continue;
        }

        if (!eligibleLeads || eligibleLeads.length === 0) {
          skippedReasons.push({
            campaign_id: campaign.id,
            reason: "No eligible leads",
          });
          continue;
        }

        // Filter out DNC contacts (belt + suspenders — DNC should be checked,
        // but contacts.is_dnc is a fast pre-filter)
        const leadsToCall: LeadToCall[] = [];
        for (const lead of eligibleLeads) {
          const contact = lead.contacts as unknown as {
            id: string;
            phone: string;
            first_name: string;
            last_name: string | null;
            is_dnc: boolean;
          };

          if (!contact || !contact.phone || contact.is_dnc) continue;

          leadsToCall.push({
            lead_id: lead.id,
            contact_id: contact.id,
            contact_phone: contact.phone,
            contact_name: [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(" "),
            retry_count: lead.retry_count,
          });
        }

        if (leadsToCall.length > 0) {
          allBatches.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            leads: leadsToCall,
          });

          orgSlotsRemaining -= leadsToCall.length;
        }
      }
    }

    // ── Auto-update leads that have exceeded max retries ──
    // Find leads in active campaigns where retry_count >= max_retries
    // and status is still 'new' or 'contacted' — mark them as 'bad_lead'
    for (const campaign of campaigns) {
      const maxRetries = campaign.max_retries ?? 3;

      const { data: exhaustedLeads } = await supabase
        .from("leads")
        .select("id")
        .eq("campaign_id", campaign.id)
        .in("status", ["new", "contacted"])
        .gte("retry_count", maxRetries)
        .limit(100);

      if (exhaustedLeads && exhaustedLeads.length > 0) {
        const ids = exhaustedLeads.map((l: { id: string }) => l.id);
        await supabase
          .from("leads")
          .update({
            status: "bad_lead",
            updated_at: new Date().toISOString(),
          })
          .in("id", ids);
      }
    }

    return jsonResponse({
      batches: allBatches,
      total_leads: allBatches.reduce((sum, b) => sum + b.leads.length, 0),
      skipped: skippedReasons,
    });
  } catch (error) {
    console.error("get-next-campaign-leads error:", error);
    return errorResponse(
      (error as Error).message ?? "Internal server error",
      500
    );
  }
});
