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

interface UpdateCampaignBody {
  campaign_id: string;
  name?: string;
  agent_id?: string;
  daily_call_limit?: number;
  max_retries?: number;
  timezone?: string;
  end_date?: string | null;
  calendar_connection_id?: string | null;
  schedules?: ScheduleInput[];
  appointment_schedules?: ScheduleInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body: UpdateCampaignBody = await req.json();

    if (!body.campaign_id) {
      return errorResponse("campaign_id is required", 400);
    }

    // Verify campaign exists and belongs to org, and is editable
    const { data: campaign, error: fetchError } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", body.campaign_id)
      .single();

    if (fetchError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      return errorResponse(
        `Cannot edit a campaign with status "${campaign.status}". Only draft and paused campaigns can be edited.`,
        400
      );
    }

    // Validate agent if provided
    if (body.agent_id) {
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("id", body.agent_id)
        .single();

      if (agentError || !agent) {
        return errorResponse("Agent not found or does not belong to your organization", 404);
      }
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.agent_id !== undefined) updates.agent_id = body.agent_id;
    if (body.daily_call_limit !== undefined) updates.daily_call_limit = body.daily_call_limit;
    if (body.max_retries !== undefined) updates.max_retries = body.max_retries;
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.end_date !== undefined) updates.end_date = body.end_date;
    if (body.calendar_connection_id !== undefined) updates.calendar_connection_id = body.calendar_connection_id;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", body.campaign_id);

      if (updateError) {
        return errorResponse(updateError.message, 500);
      }
    }

    // Update schedules: delete existing + re-insert
    if (body.schedules) {
      const { error: delError } = await supabase
        .from("campaign_schedules")
        .delete()
        .eq("campaign_id", body.campaign_id);

      if (delError) {
        console.error("Failed to delete existing schedules:", delError.message);
      }

      const scheduleRows = body.schedules.map((s) => ({
        campaign_id: body.campaign_id,
        day_of_week: s.day_of_week,
        enabled: s.enabled,
        slots: s.slots,
      }));

      const { error: insertError } = await supabase
        .from("campaign_schedules")
        .insert(scheduleRows);

      if (insertError) {
        console.error("Failed to insert schedules:", insertError.message);
      }
    }

    // Update appointment schedules: delete existing + re-insert
    if (body.appointment_schedules) {
      const { error: delError } = await supabase
        .from("campaign_appointment_schedules")
        .delete()
        .eq("campaign_id", body.campaign_id);

      if (delError) {
        console.error("Failed to delete existing appointment schedules:", delError.message);
      }

      const apptRows = body.appointment_schedules.map((s) => ({
        campaign_id: body.campaign_id,
        day_of_week: s.day_of_week,
        enabled: s.enabled,
        slots: s.slots,
      }));

      const { error: insertError } = await supabase
        .from("campaign_appointment_schedules")
        .insert(apptRows);

      if (insertError) {
        console.error("Failed to insert appointment schedules:", insertError.message);
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
