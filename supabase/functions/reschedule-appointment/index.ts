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

    if (req.method !== "PATCH") {
      return errorResponse("Method not allowed", 405);
    }

    const { appointment_id, scheduled_at, notes } = await req.json();

    if (!appointment_id || !scheduled_at) {
      return errorResponse("appointment_id and scheduled_at are required");
    }

    // Validate appointment belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointment_id)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Appointment not found", 404);
    }

    const updatePayload: Record<string, unknown> = {
      scheduled_at,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data, error: updateError } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("id", appointment_id)
      .eq("org_id", orgId)
      .select("id, scheduled_at")
      .single();

    if (updateError) {
      return errorResponse(updateError.message, 500);
    }

    // Fire N8N webhook for calendar sync + notifications
    const n8nUrl = Deno.env.get("N8N_WEBHOOK_BASE_URL");
    if (n8nUrl) {
      await fetch(`${n8nUrl}/appointment-updated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: data.id, org_id: orgId }),
      });
    }

    return jsonResponse(data);
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message, 500);
  }
});
