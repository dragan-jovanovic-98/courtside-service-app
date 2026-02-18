import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "appt_set"
  | "showed"
  | "closed_won"
  | "closed_lost"
  | "bad_lead";

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "appt_set",
  "showed",
  "closed_won",
  "closed_lost",
  "bad_lead",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body = await req.json();
    const { lead_id, status } = body as {
      lead_id: string;
      status: LeadStatus;
    };

    if (!lead_id) {
      return errorResponse("lead_id is required", 400);
    }
    if (!status) {
      return errorResponse("status is required", 400);
    }
    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    // Verify lead exists (RLS ensures org isolation)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return errorResponse("Lead not found", 404);
    }

    // Update lead status
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", lead_id);

    if (updateError) {
      return errorResponse(updateError.message, 500);
    }

    return jsonResponse({ id: lead_id, status });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
