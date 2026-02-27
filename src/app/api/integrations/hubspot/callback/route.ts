import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * HubSpot OAuth Callback
 *
 * HubSpot redirects here after user authorizes.
 * We exchange the code via the crm-oauth-callback Edge Function,
 * then redirect to the integrations settings page.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  const settingsUrl = `${siteUrl}/settings/integrations`;

  if (error) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(`HubSpot auth failed: ${error}`)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh the session — the JWT may have expired during the OAuth redirect
    const { data: refreshData } = await supabase.auth.refreshSession();
    let session = refreshData?.session;

    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData?.session;
    }

    if (!session) {
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Not authenticated — please log in and try again")}`
      );
    }

    const redirectUri = `${siteUrl}/api/integrations/hubspot/callback`;

    const edgeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/crm-oauth-callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          provider: "hubspot",
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!edgeResponse.ok) {
      const errBody = await edgeResponse.text();
      console.error("CRM OAuth callback failed:", errBody);
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Failed to connect HubSpot")}`
      );
    }

    const result = await edgeResponse.json();

    return NextResponse.redirect(
      `${settingsUrl}?success=${encodeURIComponent(
        `HubSpot connected (${result.account_name})`
      )}`
    );
  } catch (err) {
    console.error("HubSpot OAuth callback error:", err);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("An unexpected error occurred")}`
    );
  }
}
