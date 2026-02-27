/**
 * Shared OAuth token refresh utilities for Google, Outlook, and HubSpot.
 * Used by Edge Functions that need to make API calls on behalf of connected integrations.
 */

import { createServiceClient } from "./supabase-client.ts";

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
}

interface IntegrationConfig {
  access_token: string;
  refresh_token: string;
  token_expiry?: string;
  [key: string]: unknown;
}

// ── Google Token Refresh ────────────────────────────────────────────

export async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  return response.json();
}

// ── Outlook Token Refresh ───────────────────────────────────────────

export async function refreshOutlookToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
        client_secret: Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope:
          "https://graph.microsoft.com/Calendars.ReadWrite offline_access User.Read",
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Outlook token refresh failed: ${err}`);
  }

  return response.json();
}

// ── HubSpot Token Refresh ───────────────────────────────────────────

export async function refreshHubSpotToken(
  refreshToken: string
): Promise<TokenResponse> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("HUBSPOT_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("HUBSPOT_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot token refresh failed: ${err}`);
  }

  return response.json();
}

// ── Unified: Get valid access token for an integration ──────────────

/**
 * Returns a valid access token for the given integration.
 * If the token is expired or about to expire, refreshes it and updates the DB.
 * Returns null if refresh fails (token revoked), and marks integration as needing reauth.
 */
export async function getValidAccessToken(
  integrationId: string,
  provider: "google" | "outlook" | "hubspot"
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("id, config, status")
    .eq("id", integrationId)
    .single();

  if (error || !integration) {
    throw new Error(`Integration ${integrationId} not found`);
  }

  const config = integration.config as IntegrationConfig;
  if (!config?.access_token || !config?.refresh_token) {
    return null;
  }

  // Check if token is still valid (with 5 min buffer)
  if (config.token_expiry) {
    const expiry = new Date(config.token_expiry);
    const bufferMs = 5 * 60 * 1000;
    if (expiry.getTime() - bufferMs > Date.now()) {
      return config.access_token;
    }
  }

  // Token expired or no expiry recorded — refresh it
  try {
    let tokenResponse: TokenResponse;

    switch (provider) {
      case "google":
        tokenResponse = await refreshGoogleToken(config.refresh_token);
        break;
      case "outlook":
        tokenResponse = await refreshOutlookToken(config.refresh_token);
        break;
      case "hubspot":
        tokenResponse = await refreshHubSpotToken(config.refresh_token);
        break;
    }

    // Compute new expiry
    const expiresIn = tokenResponse.expires_in ?? 3600;
    const tokenExpiry = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString();

    // Update the integration config with new tokens
    const updatedConfig = {
      ...config,
      access_token: tokenResponse.access_token,
      token_expiry: tokenExpiry,
    };

    // Some providers rotate refresh tokens
    if (tokenResponse.refresh_token) {
      updatedConfig.refresh_token = tokenResponse.refresh_token;
    }

    await supabase
      .from("integrations")
      .update({ config: updatedConfig })
      .eq("id", integrationId);

    return tokenResponse.access_token;
  } catch (err) {
    console.error(`Token refresh failed for integration ${integrationId}:`, err);

    // Mark integration as needing reauth
    await supabase
      .from("integrations")
      .update({ status: "needs_reauth" })
      .eq("id", integrationId);

    return null;
  }
}
