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

    const body = await req.json();
    const {
      name,
      direction,
      agent_type,
      voice_gender,
      purpose_description,
      campaign_goals,
      preferred_greeting,
      additional_notes,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("name is required");
    }

    if (!direction || !["inbound", "outbound"].includes(direction)) {
      return errorResponse("direction must be 'inbound' or 'outbound'");
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: name.trim(),
        org_id: orgId,
        direction,
        status: "pending",
        agent_type: agent_type ?? null,
        voice_gender: voice_gender ?? null,
        purpose_description: purpose_description ?? null,
        campaign_goals: campaign_goals ?? null,
        preferred_greeting: preferred_greeting ?? null,
        additional_notes: additional_notes ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert agent:", error);
      return errorResponse("Failed to submit agent request", 500);
    }

    return jsonResponse({ id: data.id }, 201);
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("submit-agent-request error:", error);
    return errorResponse(error.message, 500);
  }
});
