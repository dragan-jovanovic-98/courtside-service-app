import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createServiceClient();

    // Check if org already has a Stripe customer
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return errorResponse("Organization not found", 404);
    }

    if (org.stripe_customer_id) {
      return jsonResponse({ customer_id: org.stripe_customer_id, already_exists: true });
    }

    // Get user email for the Stripe customer record
    const { data: user } = await supabase
      .from("users")
      .select("email, first_name, last_name")
      .eq("id", userId)
      .single();

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return errorResponse("Billing service not configured", 500);
    }

    // Create Stripe customer
    const params = new URLSearchParams();
    params.append("name", org.name || "");
    if (user?.email) params.append("email", user.email);
    params.append("metadata[org_id]", orgId);
    params.append("metadata[created_by]", userId);

    const stripeRes = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      console.error("Stripe API error:", stripeRes.status, err);
      return errorResponse("Failed to create billing account", 502);
    }

    const customer = await stripeRes.json();

    // Save customer ID to org
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ stripe_customer_id: customer.id })
      .eq("id", orgId);

    if (updateError) {
      console.error("Failed to save stripe_customer_id:", updateError);
      return errorResponse("Billing account created but failed to save", 500);
    }

    return jsonResponse({ customer_id: customer.id, already_exists: false });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("create-stripe-customer error:", error);
    return errorResponse(error.message, 500);
  }
});
