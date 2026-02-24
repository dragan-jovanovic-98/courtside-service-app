import { createClient } from "./client";

export async function callEdgeFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();

  // Force a token refresh by calling getUser() before invoking
  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { data: null, error: "Not authenticated. Please sign in again." };
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
  });

  if (error) {
    const msg = error.message || "Edge function error";
    console.error(`Edge function "${name}" error:`, msg);
    return { data: null, error: msg };
  }

  return { data: data as T, error: null };
}
