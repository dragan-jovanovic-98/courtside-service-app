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

    if (req.method !== "PATCH") {
      return errorResponse("Method not allowed", 405);
    }

    const { action_item_id, resolution_type, resolution_detail } =
      await req.json();

    if (!action_item_id || !resolution_type) {
      return errorResponse("action_item_id and resolution_type are required");
    }

    const validResolutionTypes = [
      "appointment_scheduled",
      "followup_scheduled",
      "not_interested",
      "wrong_number",
      "dismissed",
    ];

    if (!validResolutionTypes.includes(resolution_type)) {
      return errorResponse(
        `Invalid resolution_type. Must be one of: ${validResolutionTypes.join(", ")}`
      );
    }

    // Validate action item exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from("action_items")
      .select("id")
      .eq("id", action_item_id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Action item not found", 404);
    }

    const resolvedAt = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from("action_items")
      .update({
        is_resolved: true,
        resolved_at: resolvedAt,
        resolution_type,
        ...(resolution_detail !== undefined && { resolution_detail }),
      })
      .eq("id", action_item_id)
      .eq("org_id", orgId)
      .select("id, is_resolved, resolved_at")
      .single();

    if (updateError) {
      return errorResponse(updateError.message, 500);
    }

    return jsonResponse(data);
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message, 500);
  }
});
