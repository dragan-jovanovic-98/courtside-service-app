import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient, createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";
import { getCalendarProvider } from "../_shared/calendar-providers.ts";

/**
 * calendar-status — Health check endpoint
 *
 * GET ?campaign_id=uuid  OR  ?integration_id=uuid
 * Auth: User JWT or Service key + org_id param
 *
 * Checks token validity and calendar accessibility.
 * Returns status: healthy | needs_reauth | token_expired | calendar_inaccessible | not_connected
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("campaign_id");
    const integrationId = url.searchParams.get("integration_id");
    const orgIdParam = url.searchParams.get("org_id");

    if (!campaignId && !integrationId) {
      return errorResponse("Provide campaign_id or integration_id", 400);
    }

    // ── Determine org and client ──
    let orgId: string;
    let supabase;

    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "__never__";
    const hasJwt = authHeader && authHeader.startsWith("Bearer ") && !authHeader.includes(serviceKey);

    if (hasJwt) {
      try {
        const ctx = await getAuthContext(req);
        orgId = ctx.orgId;
        supabase = createServiceClient();
      } catch {
        return errorResponse("Unauthorized", 401);
      }
    } else if (orgIdParam) {
      orgId = orgIdParam;
      supabase = createServiceClient();
    } else {
      return errorResponse("Unauthorized — provide a JWT or org_id parameter", 401);
    }

    // ── Resolve integration ──
    let resolvedIntegrationId: string | null = integrationId;
    let calendarConnectionId: string | null = null;

    if (campaignId) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("calendar_connection_id")
        .eq("id", campaignId)
        .eq("org_id", orgId)
        .single();

      if (!campaign?.calendar_connection_id) {
        return jsonResponse({
          status: "not_connected",
          provider: null,
          account_email: null,
          token_valid: false,
          token_expires_at: null,
          calendar_accessible: false,
          last_checked: new Date().toISOString(),
          issues: ["No calendar connected to this campaign"],
        });
      }

      calendarConnectionId = campaign.calendar_connection_id;

      const { data: calConn } = await supabase
        .from("calendar_connections")
        .select("integration_id")
        .eq("id", calendarConnectionId)
        .single();

      resolvedIntegrationId = calConn?.integration_id ?? null;
    }

    if (!resolvedIntegrationId) {
      return jsonResponse({
        status: "not_connected",
        provider: null,
        account_email: null,
        token_valid: false,
        token_expires_at: null,
        calendar_accessible: false,
        last_checked: new Date().toISOString(),
        issues: ["Integration not found"],
      });
    }

    // ── Fetch integration ──
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("id, service_name, status, account_email, config")
      .eq("id", resolvedIntegrationId)
      .eq("org_id", orgId)
      .single();

    if (intError || !integration) {
      return jsonResponse({
        status: "not_connected",
        provider: null,
        account_email: null,
        token_valid: false,
        token_expires_at: null,
        calendar_accessible: false,
        last_checked: new Date().toISOString(),
        issues: ["Integration not found"],
      });
    }

    const provider = integration.service_name === "google_calendar" ? "google" : "outlook";
    const config = integration.config as { token_expiry?: string } | null;
    const issues: string[] = [];

    // ── Check if integration needs reauth ──
    if (integration.status === "needs_reauth") {
      return jsonResponse({
        status: "needs_reauth",
        provider,
        account_email: integration.account_email,
        token_valid: false,
        token_expires_at: config?.token_expiry ?? null,
        calendar_accessible: false,
        last_checked: new Date().toISOString(),
        issues: ["Token has been revoked or expired. Please reconnect."],
      });
    }

    // ── Check token validity ──
    let tokenValid = false;
    let tokenExpiresAt = config?.token_expiry ?? null;

    try {
      const accessToken = await getValidAccessToken(resolvedIntegrationId, provider as "google" | "outlook");
      tokenValid = !!accessToken;

      if (!accessToken) {
        issues.push("Could not obtain a valid access token");
      }

      // If token was refreshed, re-read the config for updated expiry
      if (accessToken) {
        const { data: refreshed } = await supabase
          .from("integrations")
          .select("config")
          .eq("id", resolvedIntegrationId)
          .single();
        const refreshedConfig = refreshed?.config as { token_expiry?: string } | null;
        tokenExpiresAt = refreshedConfig?.token_expiry ?? tokenExpiresAt;
      }
    } catch {
      tokenValid = false;
      issues.push("Token refresh failed");
    }

    // ── Check calendar accessibility ──
    let calendarAccessible = false;

    if (tokenValid) {
      try {
        const accessToken = await getValidAccessToken(resolvedIntegrationId, provider as "google" | "outlook");
        if (accessToken) {
          const calProvider = getCalendarProvider(provider as "google" | "outlook");
          const calendars = await calProvider.listCalendars(accessToken);
          calendarAccessible = calendars.length > 0;
          if (!calendarAccessible) {
            issues.push("No calendars found for this account");
          }
        }
      } catch (err) {
        calendarAccessible = false;
        issues.push(`Calendar API error: ${err.message}`);
      }
    }

    // ── Determine overall status ──
    let status: string;
    if (!tokenValid) {
      status = "token_expired";
    } else if (!calendarAccessible) {
      status = "calendar_inaccessible";
    } else {
      status = "healthy";
    }

    return jsonResponse({
      status,
      provider,
      account_email: integration.account_email,
      token_valid: tokenValid,
      token_expires_at: tokenExpiresAt,
      calendar_accessible: calendarAccessible,
      last_checked: new Date().toISOString(),
      issues,
    });
  } catch (error) {
    console.error("calendar-status error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
