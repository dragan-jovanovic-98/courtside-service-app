/**
 * Lightweight logger for agent tool calls.
 * Captures input, output, duration, and errors for analytics & debugging.
 *
 * Two usage patterns:
 *
 * 1. Manual (for complex handlers with many return paths):
 *    const log = createToolLog("agent-check-availability", { org_id, ... });
 *    // ... do work ...
 *    await log.finish(supabase, { output: responseBody, calendar_provider });
 *
 * 2. Fire-and-forget (log after building the response, non-blocking):
 *    logToolCall(supabase, { ... });
 */

import { createServiceClient } from "./supabase-client.ts";

export interface ToolCallRecord {
  tool_name: string;
  org_id: string;
  campaign_id?: string | null;
  call_id?: string | null;
  lead_id?: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  duration_ms: number;
  calendar_provider?: string | null;
  error?: string | null;
}

/**
 * Fire-and-forget: insert a tool call log row.
 * Uses its own service client so it doesn't depend on caller's client.
 * Never throws — logging failures are swallowed.
 */
export function logToolCall(record: ToolCallRecord): void {
  try {
    const supabase = createServiceClient();
    supabase
      .from("agent_tool_calls")
      .insert({
        org_id: record.org_id,
        call_id: record.call_id ?? null,
        campaign_id: record.campaign_id ?? null,
        lead_id: record.lead_id ?? null,
        tool_name: record.tool_name,
        input: record.input,
        output: record.output,
        duration_ms: record.duration_ms,
        calendar_provider: record.calendar_provider ?? null,
        error: record.error ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("tool-logger insert failed:", error.message);
      })
      .catch((err: Error) => {
        console.error("tool-logger insert failed:", err);
      });
  } catch (err) {
    console.error("tool-logger init failed:", err);
  }
}

/**
 * Timer helper for measuring endpoint duration.
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
