/**
 * OAuth URL builders for calendar and CRM integrations.
 * Used by the frontend to initiate OAuth flows (redirect to provider).
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Build Google Calendar OAuth authorization URL.
 * Scopes: calendar read/write + user email (for account identification).
 */
export function getGoogleOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/integrations/google/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Build Outlook Calendar OAuth authorization URL.
 * Scopes: calendar read/write + user profile + offline access.
 */
export function getOutlookOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_MICROSOFT_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/integrations/outlook/callback`,
    response_type: "code",
    scope: [
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
      "offline_access",
    ].join(" "),
    response_mode: "query",
    prompt: "consent", // Force consent to guarantee refresh_token is returned
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Build HubSpot OAuth authorization URL.
 * Scopes: contacts, CRM objects for engagement creation.
 */
export function getHubSpotOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_HUBSPOT_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/integrations/hubspot/callback`,
    scope: [
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.lists.read",
      "crm.schemas.contacts.read",
      "crm.objects.deals.read",
      "crm.objects.owners.read",
      "sales-email-read",
      // Engagement creation scopes for activity pushback
      "crm.objects.calls.write",
      "crm.objects.emails.write",
      "crm.objects.notes.write",
      "crm.objects.meetings.write",
    ].join(" "),
  });

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}
