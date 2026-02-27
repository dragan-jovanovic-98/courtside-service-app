import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

/**
 * list-calendars — Dashboard endpoint
 *
 * GET ?integration_id=uuid
 * Auth: User JWT
 *
 * Returns all calendar connections for an integration, plus linked campaign names.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { orgId } = await getAuthContext(req);
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");

    if (!integrationId) {
      return errorResponse("Missing required query parameter: integration_id", 400);
    }

    // Fetch integration details
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("id, service_name, status, account_email")
      .eq("id", integrationId)
      .eq("org_id", orgId)
      .single();

    if (intError || !integration) {
      return errorResponse("Integration not found", 404);
    }

    // Determine provider from service_name
    const provider = integration.service_name === "google_calendar" ? "google" : "outlook";

    // Fetch calendar connections
    const { data: calendars, error: calError } = await supabase
      .from("calendar_connections")
      .select("id, provider_calendar_id, calendar_name, provider, color, is_enabled_for_display, sync_direction")
      .eq("integration_id", integrationId)
      .eq("org_id", orgId)
      .order("calendar_name");

    if (calError) {
      return errorResponse("Failed to fetch calendars", 500);
    }

    // For each calendar, find linked campaigns
    const calendarIds = (calendars ?? []).map((c) => c.id);

    let campaignLinks: Array<{ calendar_connection_id: string; name: string }> = [];
    if (calendarIds.length > 0) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("calendar_connection_id, name")
        .eq("org_id", orgId)
        .in("calendar_connection_id", calendarIds);

      campaignLinks = campaigns ?? [];
    }

    // Build response with linked campaigns per calendar
    const calendarsWithLinks = (calendars ?? []).map((cal) => {
      const linked = campaignLinks
        .filter((c) => c.calendar_connection_id === cal.id)
        .map((c) => c.name);

      return {
        id: cal.id,
        provider_calendar_id: cal.provider_calendar_id,
        calendar_name: cal.calendar_name,
        provider: cal.provider,
        color: cal.color,
        is_default: cal.is_enabled_for_display,
        is_enabled_for_display: cal.is_enabled_for_display,
        sync_direction: cal.sync_direction,
        linked_campaigns: linked,
      };
    });

    return jsonResponse({
      calendars: calendarsWithLinks,
      integration: {
        id: integration.id,
        account_email: integration.account_email,
        status: integration.status,
        provider,
      },
    });
  } catch (error) {
    console.error("list-calendars error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
