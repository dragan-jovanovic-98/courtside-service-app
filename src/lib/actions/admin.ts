"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const admin = await isAdmin();
  if (!admin) throw new Error("Unauthorized: admin access required");
}

// ── Agent Actions ────────────────────────────────────────────────────

export async function createAgent(formData: FormData) {
  await ensureAdmin();
  const supabase = await createClient();

  const orgId = formData.get("org_id") as string;
  const name = formData.get("name") as string;
  const status = (formData.get("status") as string) || "pending";
  const direction = (formData.get("direction") as string) || "outbound";
  const voice = formData.get("voice") as string | null;
  const phoneNumber = formData.get("phone_number") as string | null;
  const greeting = formData.get("greeting") as string | null;
  const purpose = formData.get("purpose") as string | null;
  const notes = formData.get("notes") as string | null;

  const { error } = await supabase.from("agents").insert({
    org_id: orgId,
    name,
    status,
    direction,
    voice: voice || null,
    phone_number: phoneNumber || null,
    greeting: greeting || null,
    purpose: purpose || null,
    notes: notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/agents");
  return { success: true };
}

export async function updateAgent(agentId: string, data: Record<string, unknown>) {
  await ensureAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("agents")
    .update(data)
    .eq("id", agentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/agents");
  return { success: true };
}

export async function deleteAgent(agentId: string) {
  await ensureAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("agents").delete().eq("id", agentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/agents");
  return { success: true };
}

// ── Phone Number Actions ─────────────────────────────────────────────

export async function addPhoneNumber(formData: FormData) {
  await ensureAdmin();
  const supabase = await createClient();

  const number = formData.get("number") as string;
  const friendlyName = formData.get("friendly_name") as string | null;
  const orgId = formData.get("org_id") as string;
  const agentId = formData.get("agent_id") as string | null;
  const type = (formData.get("type") as string) || "local";
  const status = (formData.get("status") as string) || "active";

  const { error } = await supabase.from("phone_numbers").insert({
    number,
    friendly_name: friendlyName || null,
    org_id: orgId,
    agent_id: agentId || null,
    type,
    status,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/phone-numbers");
  return { success: true };
}

export async function updatePhoneNumber(id: string, data: Record<string, unknown>) {
  await ensureAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("phone_numbers")
    .update(data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/phone-numbers");
  return { success: true };
}

export async function deletePhoneNumber(id: string) {
  await ensureAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("phone_numbers").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/phone-numbers");
  return { success: true };
}

// ── Verification Actions ─────────────────────────────────────────────

export async function approveVerification(id: string) {
  await ensureAdmin();
  const supabase = await createClient();

  const { data: verification, error: fetchErr } = await supabase
    .from("verification")
    .select("org_id")
    .eq("id", id)
    .single();

  if (fetchErr || !verification) return { error: "Verification not found" };

  const { error } = await supabase
    .from("verification")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Notify org users
  const { data: orgUsers } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", verification.org_id);

  if (orgUsers) {
    const notifications = orgUsers.map((u) => ({
      user_id: u.id,
      org_id: verification.org_id,
      type: "verification",
      title: "Verification Approved",
      body: "Your business verification has been approved.",
      channel: "in_app" as const,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath("/admin/verification");
  return { success: true };
}

export async function rejectVerification(id: string) {
  await ensureAdmin();
  const supabase = await createClient();

  const { data: verification, error: fetchErr } = await supabase
    .from("verification")
    .select("org_id")
    .eq("id", id)
    .single();

  if (fetchErr || !verification) return { error: "Verification not found" };

  const { error } = await supabase
    .from("verification")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Notify org users
  const { data: orgUsers } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", verification.org_id);

  if (orgUsers) {
    const notifications = orgUsers.map((u) => ({
      user_id: u.id,
      org_id: verification.org_id,
      type: "verification",
      title: "Verification Rejected",
      body: "Your business verification was not approved. Please review and resubmit.",
      channel: "in_app" as const,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  revalidatePath("/admin/verification");
  return { success: true };
}
