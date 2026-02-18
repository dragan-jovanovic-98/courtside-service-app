import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

type CampaignStatus = "draft" | "active" | "paused" | "completed";

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["active"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: [],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body = await req.json();
    const { campaign_id, status } = body as {
      campaign_id: string;
      status: CampaignStatus;
    };

    if (!campaign_id) {
      return errorResponse("campaign_id is required", 400);
    }
    if (!status) {
      return errorResponse("status is required", 400);
    }

    const validStatuses: CampaignStatus[] = [
      "draft",
      "active",
      "paused",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    // Fetch campaign (RLS ensures org isolation)
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("id, status, agent_id")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    const currentStatus = campaign.status as CampaignStatus;
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(status)) {
      return errorResponse(
        `Cannot transition from '${currentStatus}' to '${status}'. Allowed: ${
          allowedNext.length > 0 ? allowedNext.join(", ") : "none"
        }`,
        400
      );
    }

    // If activating, verify campaign has leads and an agent
    if (status === "active") {
      if (!campaign.agent_id) {
        return errorResponse(
          "Cannot activate: campaign has no assigned agent",
          400
        );
      }

      const { count, error: countError } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id);

      if (countError) {
        return errorResponse("Failed to check leads count", 500);
      }

      if (!count || count === 0) {
        return errorResponse(
          "Cannot activate: campaign has no leads",
          400
        );
      }
    }

    // Update status
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", campaign_id);

    if (updateError) {
      return errorResponse(updateError.message, 500);
    }

    return jsonResponse({ id: campaign_id, status });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
