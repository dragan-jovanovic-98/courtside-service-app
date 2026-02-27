import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

/**
 * update-calendar-connection — Dashboard endpoint
 *
 * PATCH { calendar_connection_id, is_enabled_for_display?, sync_direction? }
 * Auth: User JWT
 *
 * Updates display/sync settings for a calendar connection.
 */

const VALID_SYNC_DIRECTIONS = ["none", "read", "write", "read_write"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "PATCH") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { orgId } = await getAuthContext(req);
    const supabase = createServiceClient();

    const body = await req.json();
    const { calendar_connection_id, is_enabled_for_display, sync_direction } = body;

    if (!calendar_connection_id) {
      return errorResponse("calendar_connection_id is required", 400);
    }

    // Validate sync_direction if provided
    if (sync_direction !== undefined && !VALID_SYNC_DIRECTIONS.includes(sync_direction)) {
      return errorResponse(
        `Invalid sync_direction. Must be one of: ${VALID_SYNC_DIRECTIONS.join(", ")}`,
        400
      );
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("calendar_connections")
      .select("id, org_id")
      .eq("id", calendar_connection_id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Calendar connection not found", 404);
    }

    // Build update payload
    const updates: Record<string, unknown> = {};
    if (is_enabled_for_display !== undefined) {
      updates.is_enabled_for_display = is_enabled_for_display;
    }
    if (sync_direction !== undefined) {
      updates.sync_direction = sync_direction;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No fields to update", 400);
    }

    const { error: updateError } = await supabase
      .from("calendar_connections")
      .update(updates)
      .eq("id", calendar_connection_id);

    if (updateError) {
      return errorResponse("Failed to update calendar connection", 500);
    }

    return jsonResponse({ success: true, updated: updates });
  } catch (error) {
    console.error("update-calendar-connection error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
