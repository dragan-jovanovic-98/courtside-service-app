import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const {
      lead_id,
      contact_id,
      campaign_id,
      call_id,
      scheduled_at,
      duration_minutes,
      notes,
    } = await req.json();

    if (!lead_id || !contact_id || !campaign_id || !scheduled_at) {
      return errorResponse(
        "lead_id, contact_id, campaign_id, and scheduled_at are required"
      );
    }

    // Validate lead belongs to org
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", lead_id)
      .eq("org_id", orgId)
      .single();

    if (leadError || !lead) {
      return errorResponse("Lead not found", 404);
    }

    const { data, error: insertError } = await supabase
      .from("appointments")
      .insert({
        org_id: orgId,
        lead_id,
        contact_id,
        campaign_id,
        ...(call_id && { call_id }),
        scheduled_at,
        ...(duration_minutes && { duration_minutes }),
        ...(notes && { notes }),
        status: "scheduled",
      })
      .select("id")
      .single();

    if (insertError) {
      return errorResponse(insertError.message, 500);
    }

    // Fire N8N webhook for calendar sync + notifications
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (n8nUrl) {
      await fetch(`${n8nUrl}/appointment-created`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: data.id, org_id: orgId }),
      });
    }

    return jsonResponse({ id: data.id }, 201);
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message, 500);
  }
});
