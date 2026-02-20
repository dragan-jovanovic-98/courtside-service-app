import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const STOP_KEYWORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];

function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  // Twilio signature = Base64(HMAC-SHA1(authToken, url + sorted params))
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return expected === signature;
}

function getSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured");
    return twiml();
  }

  // Parse form-urlencoded body
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Verify Twilio signature
  const signature = request.headers.get("X-Twilio-Signature") ?? "";
  const url = request.url;
  if (!verifyTwilioSignature(url, params, signature, authToken)) {
    console.error("Invalid Twilio signature");
    return twiml();
  }

  const from = params.From; // caller's number (E.164)
  const to = params.To; // our Twilio number (E.164)
  const body = params.Body?.trim() ?? "";
  const messageSid = params.MessageSid;

  if (!from || !to) {
    console.error("Missing From or To in Twilio webhook");
    return twiml();
  }

  const supabase = getSupabaseClient();

  // 1. Match org via phone_numbers table
  const { data: phoneNumber } = await supabase
    .from("phone_numbers")
    .select("id, org_id")
    .eq("number", to)
    .eq("status", "active")
    .single();

  if (!phoneNumber) {
    console.error(`No active phone number found for ${to}`);
    return twiml();
  }

  const { org_id, id: phoneNumberId } = phoneNumber;

  // 2. Match contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("org_id", org_id)
    .eq("phone", from)
    .single();

  const contactId = contact?.id ?? null;

  // 3. Check for STOP keyword
  const isStop = STOP_KEYWORDS.includes(body.toLowerCase());

  if (isStop) {
    // DNC flow
    // Insert into dnc_list (ignore conflict if already exists)
    await supabase.from("dnc_list").upsert(
      { org_id, phone: from, reason: "SMS opt-out (STOP keyword)" },
      { onConflict: "org_id,phone" }
    );

    // Mark contact as DNC
    if (contactId) {
      await supabase
        .from("contacts")
        .update({ is_dnc: true })
        .eq("id", contactId);

      // Mark all active leads for this contact as bad_lead
      await supabase
        .from("leads")
        .update({ status: "bad_lead" as const, last_call_outcome: "dnc" as const })
        .eq("contact_id", contactId)
        .eq("org_id", org_id)
        .not("status", "in", '("closed_won","closed_lost","bad_lead")');
    }

    // Log the inbound SMS
    await supabase.from("sms_messages").insert({
      org_id,
      contact_id: contactId,
      phone_number_id: phoneNumberId,
      twilio_sid: messageSid,
      direction: "inbound",
      from_number: from,
      to_number: to,
      body,
      status: "received",
    });

    return twiml("You have been unsubscribed. You will no longer receive messages from us.");
  }

  // Normal inbound SMS flow
  // Log the SMS
  await supabase.from("sms_messages").insert({
    org_id,
    contact_id: contactId,
    phone_number_id: phoneNumberId,
    twilio_sid: messageSid,
    direction: "inbound",
    from_number: from,
    to_number: to,
    body,
    status: "received",
  });

  // Create action item + notification only if we have a known contact
  if (contactId) {
    // Find the most recent lead for context
    const { data: recentLead } = await supabase
      .from("leads")
      .select("id, campaign_id")
      .eq("contact_id", contactId)
      .eq("org_id", org_id)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    // Get campaign name if we have a lead
    let campaignName: string | null = null;
    if (recentLead?.campaign_id) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name")
        .eq("id", recentLead.campaign_id)
        .single();
      campaignName = campaign?.name ?? null;
    }

    const preview = body.length > 80 ? body.slice(0, 80) + "..." : body;

    // Insert action item
    await supabase.from("action_items").insert({
      org_id,
      contact_id: contactId,
      lead_id: recentLead?.id ?? null,
      campaign_name: campaignName,
      title: `SMS reply from ${from}`,
      description: preview,
      type: "sms_reply" as const,
    });

    // Notify all org users
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", org_id);

    if (orgUsers?.length) {
      const notifications = orgUsers.map((user) => ({
        org_id,
        user_id: user.id,
        type: "sms_reply",
        title: `New SMS from ${from}`,
        body: preview,
        reference_type: "contact" as const,
        reference_id: contactId,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  }

  return twiml();
}
