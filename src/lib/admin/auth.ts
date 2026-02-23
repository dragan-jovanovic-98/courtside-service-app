"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === "super_admin";
}

export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }
}

export async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") return null;

  return profile;
}
