import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body = await req.json();
    const { campaign_id } = body as { campaign_id: string };

    if (!campaign_id) {
      return errorResponse("campaign_id is required", 400);
    }

    // Fetch campaign (RLS ensures org isolation)
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("id, status, calls_made")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    if (campaign.status !== "draft") {
      return errorResponse(
        "Only draft campaigns can be deleted. Use archive for paused/completed campaigns.",
        400
      );
    }

    if (campaign.calls_made > 0) {
      return errorResponse(
        "Cannot delete campaign with existing calls. Use archive instead.",
        400
      );
    }

    // Delete in FK-safe order: appointment_schedules → schedules → leads → campaign
    const { error: e1 } = await supabase
      .from("campaign_appointment_schedules")
      .delete()
      .eq("campaign_id", campaign_id);

    if (e1) {
      return errorResponse(`Failed to delete appointment schedules: ${e1.message}`, 500);
    }

    const { error: e2 } = await supabase
      .from("campaign_schedules")
      .delete()
      .eq("campaign_id", campaign_id);

    if (e2) {
      return errorResponse(`Failed to delete schedules: ${e2.message}`, 500);
    }

    const { error: e3 } = await supabase
      .from("leads")
      .delete()
      .eq("campaign_id", campaign_id);

    if (e3) {
      return errorResponse(`Failed to delete leads: ${e3.message}`, 500);
    }

    const { error: e4 } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaign_id);

    if (e4) {
      return errorResponse(`Failed to delete campaign: ${e4.message}`, 500);
    }

    return jsonResponse({ deleted: campaign_id });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
