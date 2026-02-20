import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
  });
}

function getSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return json({ error: "Webhook secret not configured" }, 500);
  }

  // Read raw body for signature verification (must not parse JSON first)
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header");
    return json({ error: "Missing signature" }, 400);
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Stripe signature verification failed: ${message}`);
    return json({ error: "Invalid signature" }, 400);
  }

  const supabase = getSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpsert(supabase, event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.paid": {
        await handleInvoice(supabase, event.data.object as Stripe.Invoice, "paid");
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoice(supabase, event.data.object as Stripe.Invoice, "failed");
        break;
      }

      default:
        // Unhandled event type — acknowledge silently
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error handling ${event.type}: ${message}`);
    // Still return 200 to prevent Stripe retries on app-level errors
  }

  return json({ received: true });
}

// --- Handlers ---

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getSupabaseClient>,
  session: Stripe.Checkout.Session
) {
  const orgId = session.metadata?.org_id ?? session.client_reference_id;
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  if (!orgId || !customerId) {
    console.error("checkout.session.completed: missing org_id or customer", {
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
      customer: session.customer,
    });
    return;
  }

  const { error } = await supabase
    .from("organizations")
    .update({ stripe_customer_id: customerId })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update organizations.stripe_customer_id:", error);
  }
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getSupabaseClient>,
  subscription: Stripe.Subscription
) {
  const org = await lookupOrgByCustomer(supabase, subscription.customer);
  if (!org) return;

  // Extract plan name and period dates from the first line item
  const firstItem = subscription.items.data[0];
  const planName = firstItem?.price?.nickname
    ?? firstItem?.price?.product?.toString()
    ?? null;
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        org_id: org.id,
        stripe_subscription_id: subscription.id,
        plan_name: planName,
        status: mapSubscriptionStatus(subscription.status),
        current_period_start: periodStart,
        current_period_end: periodEnd,
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (error) {
    console.error("Failed to upsert subscription:", error);
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseClient>,
  subscription: Stripe.Subscription
) {
  const org = await lookupOrgByCustomer(supabase, subscription.customer);
  if (!org) return;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to cancel subscription:", error);
  }
}

async function handleInvoice(
  supabase: ReturnType<typeof getSupabaseClient>,
  invoice: Stripe.Invoice,
  status: "paid" | "failed"
) {
  const org = await lookupOrgByCustomer(supabase, invoice.customer);
  if (!org) return;

  // Build period label (e.g., "Feb 2026")
  const periodLabel = invoice.period_start
    ? new Date(invoice.period_start * 1000).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  const { error } = await supabase
    .from("invoices")
    .upsert(
      {
        org_id: org.id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
        status,
        invoice_url: invoice.hosted_invoice_url ?? null,
        period_label: periodLabel,
      },
      { onConflict: "stripe_invoice_id" }
    );

  if (error) {
    console.error("Failed to upsert invoice:", error);
  }

  // On payment failure, notify all org users
  if (status === "failed") {
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", org.id);

    if (orgUsers?.length) {
      const amountStr = invoice.amount_due != null
        ? `$${(invoice.amount_due / 100).toFixed(2)}`
        : "your invoice";

      const notifications = orgUsers.map((user) => ({
        org_id: org.id,
        user_id: user.id,
        type: "payment_failed",
        title: "Payment Failed",
        body: `Payment of ${amountStr} failed. Please update your payment method.`,
        reference_type: "invoice" as const,
        reference_id: null,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Failed to insert payment_failed notifications:", notifError);
      }
    }
  }
}

// --- Helpers ---

async function lookupOrgByCustomer(
  supabase: ReturnType<typeof getSupabaseClient>,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<{ id: string } | null> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) {
    console.error("No customer ID in Stripe event");
    return null;
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !org) {
    console.error(`No org found for stripe_customer_id=${customerId}`);
    return null;
  }

  return org;
}

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return stripeStatus;
  }
}
