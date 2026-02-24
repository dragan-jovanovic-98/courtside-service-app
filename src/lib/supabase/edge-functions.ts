import { createClient } from "./client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function callEdgeFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();

  // Force token refresh before reading the session
  await supabase.auth.getUser();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { data: null, error: "Not authenticated. Please sign in again." };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: T | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      // response wasn't JSON
    }

    if (!res.ok) {
      const msg = (json && typeof json === "object" && "error" in json)
        ? String((json as Record<string, unknown>).error)
        : text || `HTTP ${res.status}`;
      console.error(`Edge function "${name}" error (${res.status}):`, msg);
      return { data: null, error: msg };
    }

    return { data: json, error: null };
  } catch (err) {
    console.error(`Edge function "${name}" network error:`, err);
    return { data: null, error: (err as Error).message };
  }
}
