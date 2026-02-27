import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Outlook Calendar OAuth Callback
 *
 * Microsoft redirects here after user authorizes.
 * We exchange the code via the calendar-oauth-callback Edge Function,
 * then redirect to the integrations settings page.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  const settingsUrl = `${siteUrl}/settings/integrations`;

  if (error) {
    const errorDescription =
      searchParams.get("error_description") ?? "Unknown error";
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(`Outlook auth failed: ${errorDescription}`)}`
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Not authenticated")}`
      );
    }

    const redirectUri = `${siteUrl}/api/integrations/outlook/callback`;

    const edgeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calendar-oauth-callback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          provider: "outlook",
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!edgeResponse.ok) {
      const errBody = await edgeResponse.text();
      console.error("Calendar OAuth callback failed:", errBody);
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Failed to connect Outlook Calendar")}`
      );
    }

    const result = await edgeResponse.json();

    return NextResponse.redirect(
      `${settingsUrl}?success=${encodeURIComponent(
        `Outlook Calendar connected (${result.account_email})`
      )}`
    );
  } catch (err) {
    console.error("Outlook OAuth callback error:", err);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("An unexpected error occurred")}`
    );
  }
}
