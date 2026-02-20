import { createClient } from "./client";

export async function callEdgeFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
  method: "POST" | "PATCH" | "DELETE" = "POST"
): Promise<{ data: T | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    method,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as T, error: null };
}
