import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

interface ScheduleSlot {
  start: string;
  end: string;
}

interface ScheduleInput {
  day_of_week: number;
  enabled: boolean;
  slots: ScheduleSlot[];
}

interface CreateCampaignBody {
  name: string;
  agent_id: string;
  daily_call_limit?: number;
  max_retries?: number;
  retry_interval_hours?: number;
  timezone?: string;
  end_date?: string;
  schedules?: ScheduleInput[];
}

function buildDefaultSchedules(): ScheduleInput[] {
  // Monday (1) through Friday (5), 9am-5pm
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day_of_week: day,
    enabled: day >= 1 && day <= 5,
    slots: [{ start: "09:00", end: "17:00" }],
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body: CreateCampaignBody = await req.json();

    if (!body.name || !body.name.trim()) {
      return errorResponse("name is required", 400);
    }
    if (!body.agent_id) {
      return errorResponse("agent_id is required", 400);
    }

    // Validate agent belongs to user's org
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", body.agent_id)
      .single();

    if (agentError || !agent) {
      return errorResponse("Agent not found or does not belong to your organization", 404);
    }

    // Insert campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        org_id: orgId,
        name: body.name.trim(),
        agent_id: body.agent_id,
        status: "draft",
        daily_call_limit: body.daily_call_limit ?? 100,
        max_retries: body.max_retries ?? 3,
        retry_interval_hours: body.retry_interval_hours ?? 24,
        timezone: body.timezone ?? "America/New_York",
        end_date: body.end_date ?? null,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return errorResponse(
        campaignError?.message || "Failed to create campaign",
        500
      );
    }

    // Insert schedules
    const schedules = body.schedules ?? buildDefaultSchedules();

    const scheduleRows = schedules.map((s) => ({
      campaign_id: campaign.id,
      day_of_week: s.day_of_week,
      enabled: s.enabled,
      slots: s.slots,
    }));

    const { error: schedError } = await supabase
      .from("campaign_schedules")
      .insert(scheduleRows);

    if (schedError) {
      // Campaign was created but schedules failed — log but still return campaign
      console.error("Failed to insert schedules:", schedError.message);
    }

    return jsonResponse({ id: campaign.id }, 201);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
