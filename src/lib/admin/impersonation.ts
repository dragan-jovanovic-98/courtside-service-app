"use server";

/**
 * Impersonation support — DEFERRED
 *
 * Full impersonation (admin viewing client dashboard as the client) requires
 * modifying all existing dashboard query files to accept an org_id override.
 * For now, the org detail page in the admin panel shows comprehensive org data inline.
 *
 * The cookie mechanism is defined here and ready for future use.
 */

import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "courtside_impersonate_org";

type ImpersonationContext = {
  orgId: string;
  orgName: string;
} | null;

export async function startImpersonation(orgId: string, orgName: string) {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify({ orgId, orgName }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4, // 4 hours
    path: "/",
  });
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function getImpersonationContext(): Promise<ImpersonationContext> {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!value) return null;

  try {
    return JSON.parse(value) as ImpersonationContext;
  } catch {
    return null;
  }
}
