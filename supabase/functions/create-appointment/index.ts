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
      calendar_connection_id,
      is_manual,
      title,
    } = await req.json();

    if (!scheduled_at) {
      return errorResponse("scheduled_at is required", 400);
    }

    // Validation: either lead-based or manual appointment
    const isManualAppt = is_manual === true;

    if (!isManualAppt && (!lead_id || !contact_id || !campaign_id)) {
      return errorResponse(
        "lead_id, contact_id, and campaign_id are required for non-manual appointments. Set is_manual: true for manual appointments.",
        400
      );
    }

    if (isManualAppt && !title) {
      return errorResponse(
        "title is required for manual appointments",
        400
      );
    }

    // Validate lead belongs to org (if lead-based)
    if (lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("id", lead_id)
        .eq("org_id", orgId)
        .single();

      if (leadError || !lead) {
        return errorResponse("Lead not found", 404);
      }
    }

    // Determine sync_status
    const syncStatus = calendar_connection_id ? "pending" : "not_applicable";

    const { data, error: insertError } = await supabase
      .from("appointments")
      .insert({
        org_id: orgId,
        ...(lead_id && { lead_id }),
        ...(contact_id && { contact_id }),
        ...(campaign_id && { campaign_id }),
        ...(call_id && { call_id }),
        scheduled_at,
        ...(duration_minutes && { duration_minutes }),
        ...(notes && { notes }),
        ...(calendar_connection_id && { calendar_connection_id }),
        ...(title && { title }),
        is_manual: isManualAppt,
        sync_status: syncStatus,
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
