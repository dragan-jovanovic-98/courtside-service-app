import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

interface InitiateCallBody {
  agent_id: string;
  lead_id: string;
  contact_id: string;
  campaign_id?: string;
  phone_number_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body: InitiateCallBody = await req.json();

    // Validate required fields
    if (!body.agent_id) {
      return errorResponse("agent_id is required", 400);
    }
    if (!body.lead_id) {
      return errorResponse("lead_id is required", 400);
    }
    if (!body.contact_id) {
      return errorResponse("contact_id is required", 400);
    }

    // Validate agent belongs to org and is active
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, retell_agent_id, phone_number_id, status")
      .eq("id", body.agent_id)
      .single();

    if (agentError || !agent) {
      return errorResponse(
        "Agent not found or does not belong to your organization",
        404
      );
    }

    if (agent.status !== "active") {
      return errorResponse("Agent is not active", 400);
    }

    if (!agent.retell_agent_id) {
      return errorResponse("Agent not configured in Retell", 400);
    }

    // Get contact's phone number
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, phone")
      .eq("id", body.contact_id)
      .single();

    if (contactError || !contact) {
      return errorResponse("Contact not found", 404);
    }

    if (!contact.phone) {
      return errorResponse("Contact has no phone number", 400);
    }

    // Determine the "from" phone number
    let phoneNumberId: string | null = null;
    let fromNumber: string | null = null;

    if (body.phone_number_id) {
      // Use the explicitly provided phone number
      const { data: pn, error: pnError } = await supabase
        .from("phone_numbers")
        .select("id, number")
        .eq("id", body.phone_number_id)
        .single();

      if (pnError || !pn) {
        return errorResponse("Phone number not found", 404);
      }

      phoneNumberId = pn.id;
      fromNumber = pn.number;
    } else if (agent.phone_number_id) {
      // Use the agent's assigned phone number
      const { data: pn, error: pnError } = await supabase
        .from("phone_numbers")
        .select("id, number")
        .eq("id", agent.phone_number_id)
        .single();

      if (pnError || !pn) {
        return errorResponse("Agent's phone number not found", 404);
      }

      phoneNumberId = pn.id;
      fromNumber = pn.number;
    } else {
      // Fall back to any phone number in the org
      const { data: pn, error: pnError } = await supabase
        .from("phone_numbers")
        .select("id, number")
        .eq("status", "active")
        .limit(1)
        .single();

      if (pnError || !pn) {
        return errorResponse("No phone number available for this organization", 400);
      }

      phoneNumberId = pn.id;
      fromNumber = pn.number;
    }

    // Call Retell API to create the phone call
    const retellRes = await fetch(
      "https://api.retellai.com/v2/create-phone-call",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RETELL_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_number: fromNumber,
          to_number: contact.phone,
          override_agent_id: agent.retell_agent_id,
          metadata: {
            org_id: orgId,
            lead_id: body.lead_id,
            contact_id: body.contact_id,
            campaign_id: body.campaign_id || null,
          },
        }),
      }
    );

    if (!retellRes.ok) {
      const retellError = await retellRes.text();
      console.error("Retell API error:", retellError);
      return errorResponse("Failed to initiate call with Retell", 502);
    }

    const retellData = await retellRes.json();
    const retellCallId = retellData.call_id;

    // Insert call record into the database
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        org_id: orgId,
        lead_id: body.lead_id,
        contact_id: body.contact_id,
        agent_id: body.agent_id,
        campaign_id: body.campaign_id || null,
        phone_number_id: phoneNumberId,
        retell_call_id: retellCallId,
        direction: "outbound",
        started_at: new Date().toISOString(),
        caller_phone: fromNumber,
      })
      .select("id")
      .single();

    if (callError || !call) {
      console.error("Failed to insert call record:", callError?.message);
      return errorResponse("Call initiated but failed to save record", 500);
    }

    return jsonResponse(
      { call_id: call.id, retell_call_id: retellCallId },
      201
    );
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
