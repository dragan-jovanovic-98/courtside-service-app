import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

interface SendSmsBody {
  contact_id: string;
  lead_id?: string;
  campaign_id?: string;
  body: string;
  phone_number_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body: SendSmsBody = await req.json();

    // Validate required fields
    if (!body.contact_id) {
      return errorResponse("contact_id is required", 400);
    }
    if (!body.body || !body.body.trim()) {
      return errorResponse("body is required", 400);
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
    } else {
      // Find a texting-capable phone number for the org
      const { data: pn, error: pnError } = await supabase
        .from("phone_numbers")
        .select("id, number")
        .eq("type", "texting")
        .eq("status", "active")
        .limit(1)
        .single();

      if (pnError || !pn) {
        return errorResponse("No texting number available", 400);
      }

      phoneNumberId = pn.id;
      fromNumber = pn.number;
    }

    // Call Twilio API to send SMS
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN")!;

    const params = new URLSearchParams();
    params.append("To", contact.phone);
    params.append("From", fromNumber!);
    params.append("Body", body.body.trim());

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!twilioRes.ok) {
      const twilioError = await twilioRes.text();
      console.error("Twilio API error:", twilioError);
      return errorResponse("Failed to send SMS via Twilio", 502);
    }

    const twilioData = await twilioRes.json();

    // Insert SMS record into the database
    const { data: sms, error: smsError } = await supabase
      .from("sms_messages")
      .insert({
        org_id: orgId,
        contact_id: body.contact_id,
        lead_id: body.lead_id || null,
        phone_number_id: phoneNumberId,
        twilio_sid: twilioData.sid,
        direction: "outbound",
        from_number: fromNumber,
        to_number: contact.phone,
        body: body.body.trim(),
        status: twilioData.status || "queued",
      })
      .select("id")
      .single();

    if (smsError || !sms) {
      console.error("Failed to insert SMS record:", smsError?.message);
      return errorResponse("SMS sent but failed to save record", 500);
    }

    return jsonResponse(
      { id: sms.id, twilio_sid: twilioData.sid, status: twilioData.status },
      201
    );
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
