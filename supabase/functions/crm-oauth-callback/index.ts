import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

/**
 * crm-oauth-callback Edge Function
 *
 * Called by the Next.js OAuth callback route after receiving the authorization code.
 * Exchanges the code for tokens and creates/updates the integration row.
 *
 * POST body: { provider: "hubspot", code: string, redirect_uri: string }
 */

// ── HubSpot helpers ─────────────────────────────────────────────────

async function exchangeHubSpotCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("HUBSPOT_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("HUBSPOT_CLIENT_SECRET") ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot token exchange failed: ${err}`);
  }

  return response.json();
}

async function fetchHubSpotAccountInfo(
  accessToken: string
): Promise<{ portalId: string; accountName: string }> {
  const response = await fetch(
    "https://api.hubapi.com/oauth/v1/access-tokens/" + accessToken,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    return { portalId: "unknown", accountName: "HubSpot Account" };
  }

  const data = await response.json();
  return {
    portalId: String(data.hub_id ?? "unknown"),
    accountName: data.hub_domain ?? data.user ?? "HubSpot Account",
  };
}

// ── Main handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Auth: user must be logged in
    const { userId, orgId } = await getAuthContext(req);

    const body = await req.json();
    const { provider, code, redirect_uri } = body;

    if (!provider || !code || !redirect_uri) {
      return errorResponse(
        "Missing required fields: provider, code, redirect_uri",
        400
      );
    }

    if (provider !== "hubspot") {
      return errorResponse(
        "Invalid provider. Only hubspot is supported currently.",
        400
      );
    }

    const supabase = createServiceClient();

    // ── Check: only one CRM per org ──
    const { data: existingCrm } = await supabase
      .from("integrations")
      .select("id, service_name")
      .eq("org_id", orgId)
      .eq("service_type", "crm")
      .eq("status", "connected")
      .maybeSingle();

    if (existingCrm && existingCrm.service_name !== "hubspot") {
      return errorResponse(
        `Already connected to ${existingCrm.service_name}. Disconnect it before connecting HubSpot.`,
        409
      );
    }

    // ── Exchange code for tokens ──
    const tokens = await exchangeHubSpotCode(code, redirect_uri);

    // ── Fetch account info ──
    const accountInfo = await fetchHubSpotAccountInfo(tokens.access_token);

    const tokenExpiry = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const config = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokenExpiry,
      portal_id: accountInfo.portalId,
      // Default activity sync toggles — all enabled
      sync_calls: true,
      sync_sms_sent: true,
      sync_sms_received: true,
      sync_emails: true,
      sync_appointments: true,
    };

    let integrationId: string;

    if (existingCrm) {
      // Re-connecting same CRM — update tokens
      await supabase
        .from("integrations")
        .update({
          config,
          status: "connected",
          connected_at: new Date().toISOString(),
          account_email: accountInfo.accountName,
        })
        .eq("id", existingCrm.id);
      integrationId = existingCrm.id;
    } else {
      // New CRM connection
      const { data: newIntegration, error: insertError } = await supabase
        .from("integrations")
        .insert({
          org_id: orgId,
          service_name: "hubspot",
          status: "connected",
          config,
          connected_at: new Date().toISOString(),
          account_email: accountInfo.accountName,
          service_type: "crm",
        })
        .select("id")
        .single();

      if (insertError || !newIntegration) {
        throw new Error(
          `Failed to create integration: ${insertError?.message}`
        );
      }
      integrationId = newIntegration.id;
    }

    return jsonResponse({
      success: true,
      integration_id: integrationId,
      provider: "hubspot",
      account_name: accountInfo.accountName,
      portal_id: accountInfo.portalId,
    });
  } catch (error) {
    console.error("crm-oauth-callback error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
