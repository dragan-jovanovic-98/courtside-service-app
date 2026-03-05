import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

// Price IDs by country and tier
const PRICES: Record<string, Record<string, string>> = {
  CA: {
    starter: "price_1T7gQxIqQIvHWpxaAvsZK9oL",
    professional: "price_1T7gRTIqQIvHWpxaRiQu3Jws",
    enterprise: "price_1T7gS6IqQIvHWpxa39MwYjv8",
  },
  US: {
    starter: "price_1T7gT1IqQIvHWpxaPsh1SEyA",
    professional: "price_1T7gTIIqQIvHWpxaaayecjCX",
    enterprise: "price_1T7gTdIqQIvHWpxat7ihp0SC",
  },
};

// Minutes included per tier (for storing in subscription metadata)
const MINUTES: Record<string, number> = {
  starter: 750,
  professional: 1500,
  enterprise: 4000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createServiceClient();

    const body = await req.json();
    const tier = body.tier; // "starter" | "professional" | "enterprise"
    const returnUrl = body.return_url;

    if (!tier || !PRICES.CA[tier]) {
      return errorResponse("Invalid tier. Must be: starter, professional, or enterprise", 400);
    }

    // Get org details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id, country, name")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return errorResponse("Organization not found", 404);
    }

    if (!org.stripe_customer_id) {
      return errorResponse("No billing account. Please contact support.", 400);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return errorResponse("Billing service not configured", 500);
    }

    // Determine currency based on country
    const country = org.country === "CA" ? "CA" : "US";
    const priceId = PRICES[country][tier];

    // Build return URL
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const baseUrl = origin
      ? new URL(origin).origin
      : "https://services.court-side.ai";
    const successUrl = returnUrl || `${baseUrl}/settings/billing?checkout=success`;
    const cancelUrl = `${baseUrl}/settings/billing?checkout=cancelled`;

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("customer", org.stripe_customer_id);
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("metadata[org_id]", orgId);
    params.append("metadata[tier]", tier);
    params.append("metadata[country]", country);
    params.append("subscription_data[metadata][org_id]", orgId);
    params.append("subscription_data[metadata][tier]", tier);
    params.append("subscription_data[metadata][minutes_included]", MINUTES[tier].toString());

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      console.error("Stripe Checkout error:", stripeRes.status, err);
      return errorResponse("Failed to create checkout session", 502);
    }

    const session = await stripeRes.json();

    return jsonResponse({ url: session.url });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("create-checkout-session error:", error);
    return errorResponse(error.message, 500);
  }
});
