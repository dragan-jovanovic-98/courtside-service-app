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

    // Accept both GET and POST
    let returnUrl: string | null = null;

    if (req.method === "POST") {
      const body = await req.json();
      returnUrl = body.return_url ?? null;
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      returnUrl = url.searchParams.get("return_url");
    }

    // Fall back to origin-based default
    if (!returnUrl) {
      const origin = req.headers.get("origin") || req.headers.get("referer");
      const baseUrl = origin
        ? new URL(origin).origin
        : "http://localhost:3000";
      returnUrl = `${baseUrl}/settings/billing`;
    }

    // Look up the organization's Stripe customer ID
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      console.error("Failed to fetch organization:", orgError);
      return errorResponse("Organization not found", 404);
    }

    if (!org.stripe_customer_id) {
      return errorResponse("No billing account found", 400);
    }

    // Create a Stripe Billing Portal session
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return errorResponse("Billing service not configured", 500);
    }

    const stripeParams = new URLSearchParams();
    stripeParams.append("customer", org.stripe_customer_id);
    stripeParams.append("return_url", returnUrl);

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeParams.toString(),
      }
    );

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error("Stripe API error:", stripeResponse.status, stripeError);
      return errorResponse("Failed to create billing portal session", 502);
    }

    const portalSession = await stripeResponse.json();

    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("stripe-portal-url error:", error);
    return errorResponse(error.message, 500);
  }
});
