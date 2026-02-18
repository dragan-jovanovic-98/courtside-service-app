import { createUserClient } from "./supabase-client.ts";

export interface AuthContext {
  userId: string;
  orgId: string;
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const supabase = createUserClient(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  return { userId: user.id, orgId: profile.org_id };
}
