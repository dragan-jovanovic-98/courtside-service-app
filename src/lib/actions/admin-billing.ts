"use server";

import { isAdmin } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized: admin access required");
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_API = "https://api.stripe.com/v1";

async function stripeRequest(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, string>
) {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(`${STRIPE_API}${path}`, options);
  return res.json();
}

export async function cancelSubscription(stripeSubscriptionId: string) {
  await ensureAdmin();

  const result = await stripeRequest(
    `/subscriptions/${stripeSubscriptionId}`,
    "POST",
    { cancel_at_period_end: "true" }
  );

  if (result.error) {
    return { error: result.error.message };
  }

  revalidatePath("/admin/billing");
  return { success: true };
}

export async function issueRefund(chargeId: string, amountCents?: number) {
  await ensureAdmin();

  const body: Record<string, string> = { charge: chargeId };
  if (amountCents) {
    body.amount = amountCents.toString();
  }

  const result = await stripeRequest("/refunds", "POST", body);

  if (result.error) {
    return { error: result.error.message };
  }

  revalidatePath("/admin/billing");
  return { success: true };
}

export async function getRecentCharges(customerId: string) {
  await ensureAdmin();

  const result = await stripeRequest(
    `/charges?customer=${customerId}&limit=10`
  );

  if (result.error) {
    return { error: result.error.message, charges: [] };
  }

  return {
    charges: (result.data ?? []).map(
      (c: { id: string; amount: number; currency: string; created: number; status: string; description: string | null }) => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        created: new Date(c.created * 1000).toISOString(),
        status: c.status,
        description: c.description,
      })
    ),
  };
}
