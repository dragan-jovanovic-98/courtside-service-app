import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

/**
 * calendar-oauth-callback Edge Function
 *
 * Called by the Next.js OAuth callback route after receiving the authorization code.
 * Exchanges the code for tokens, fetches the calendar list, and creates DB rows.
 *
 * POST body: { provider: "google" | "outlook", code: string, redirect_uri: string }
 */

// ── Google helpers ──────────────────────────────────────────────────

async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  return response.json();
}

async function fetchGoogleCalendars(
  accessToken: string
): Promise<Array<{ id: string; summary: string; backgroundColor?: string; primary?: boolean }>> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google calendar list fetch failed: ${err}`);
  }

  const data = await response.json();
  return data.items ?? [];
}

async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) return "Unknown";
  const data = await response.json();
  return data.email ?? "Unknown";
}

// ── Outlook helpers ─────────────────────────────────────────────────

async function exchangeOutlookCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope:
          "https://graph.microsoft.com/Calendars.ReadWrite offline_access User.Read",
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Outlook token exchange failed: ${err}`);
  }

  return response.json();
}

async function fetchOutlookCalendars(
  accessToken: string
): Promise<Array<{ id: string; name: string; color?: string; isDefaultCalendar?: boolean }>> {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendars",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Outlook calendar list fetch failed: ${err}`);
  }

  const data = await response.json();
  return data.value ?? [];
}

async function fetchOutlookUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return "Unknown";
  const data = await response.json();
  return data.mail ?? data.userPrincipalName ?? "Unknown";
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
      return errorResponse("Missing required fields: provider, code, redirect_uri", 400);
    }

    if (!["google", "outlook"].includes(provider)) {
      return errorResponse("Invalid provider. Must be google or outlook.", 400);
    }

    const supabase = createServiceClient();

    // ── Exchange code for tokens ──
    let accessToken: string;
    let refreshToken: string;
    let expiresIn: number;

    if (provider === "google") {
      const tokens = await exchangeGoogleCode(code, redirect_uri);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
      expiresIn = tokens.expires_in;
    } else {
      const tokens = await exchangeOutlookCode(code, redirect_uri);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
      expiresIn = tokens.expires_in;
    }

    if (!refreshToken) {
      return errorResponse(
        "No refresh token received. For Google, ensure access_type=offline and prompt=consent.",
        400
      );
    }

    // ── Fetch account email ──
    const accountEmail =
      provider === "google"
        ? await fetchGoogleUserEmail(accessToken)
        : await fetchOutlookUserEmail(accessToken);

    // ── Check for existing integration with same account ──
    const serviceName = provider === "google" ? "google_calendar" : "outlook_calendar";

    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("org_id", orgId)
      .eq("service_name", serviceName)
      .eq("account_email", accountEmail)
      .maybeSingle();

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const config = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: tokenExpiry,
    };

    let integrationId: string;

    if (existing) {
      // Update existing integration
      await supabase
        .from("integrations")
        .update({
          config,
          status: "connected",
          connected_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      integrationId = existing.id;
    } else {
      // Create new integration
      const { data: newIntegration, error: insertError } = await supabase
        .from("integrations")
        .insert({
          org_id: orgId,
          service_name: serviceName,
          status: "connected",
          config,
          connected_at: new Date().toISOString(),
          account_email: accountEmail,
          service_type: "calendar",
        })
        .select("id")
        .single();

      if (insertError || !newIntegration) {
        throw new Error(`Failed to create integration: ${insertError?.message}`);
      }
      integrationId = newIntegration.id;
    }

    // ── Fetch calendars and create calendar_connections ──
    let calendarsCreated = 0;

    if (provider === "google") {
      const calendars = await fetchGoogleCalendars(accessToken);

      for (const cal of calendars) {
        const { error: calError } = await supabase
          .from("calendar_connections")
          .upsert(
            {
              org_id: orgId,
              integration_id: integrationId,
              provider: "google",
              provider_calendar_id: cal.id,
              calendar_name: cal.summary ?? cal.id,
              color: cal.backgroundColor ?? "#4285f4",
              is_enabled_for_display: cal.primary ?? false,
              sync_direction: "none",
            },
            { onConflict: "integration_id,provider_calendar_id" }
          );

        if (!calError) calendarsCreated++;
      }
    } else {
      const calendars = await fetchOutlookCalendars(accessToken);

      for (const cal of calendars) {
        const { error: calError } = await supabase
          .from("calendar_connections")
          .upsert(
            {
              org_id: orgId,
              integration_id: integrationId,
              provider: "outlook",
              provider_calendar_id: cal.id,
              calendar_name: cal.name ?? cal.id,
              color: cal.color ?? "#0078d4",
              is_enabled_for_display: cal.isDefaultCalendar ?? false,
              sync_direction: "none",
            },
            { onConflict: "integration_id,provider_calendar_id" }
          );

        if (!calError) calendarsCreated++;
      }
    }

    return jsonResponse({
      success: true,
      integration_id: integrationId,
      account_email: accountEmail,
      calendars_created: calendarsCreated,
      provider,
    });
  } catch (error) {
    console.error("calendar-oauth-callback error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});
