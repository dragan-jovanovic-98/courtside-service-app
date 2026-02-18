import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

interface SendEmailBody {
  contact_id: string;
  lead_id?: string;
  subject: string;
  html_body: string;
  type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const body: SendEmailBody = await req.json();

    // Validate required fields
    if (!body.contact_id) {
      return errorResponse("contact_id is required", 400);
    }
    if (!body.subject || !body.subject.trim()) {
      return errorResponse("subject is required", 400);
    }
    if (!body.html_body || !body.html_body.trim()) {
      return errorResponse("html_body is required", 400);
    }

    // Get contact's email
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("id", body.contact_id)
      .single();

    if (contactError || !contact) {
      return errorResponse("Contact not found", 404);
    }

    if (!contact.email) {
      return errorResponse("Contact has no email address", 400);
    }

    // Get organization name for the "from" field
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return errorResponse("Organization not found", 404);
    }

    const fromEmail =
      Deno.env.get("SENDGRID_FROM_EMAIL") || `noreply@courtsideai.com`;

    // Call SendGrid API to send the email
    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: contact.email }] }],
        from: { email: fromEmail, name: org.name },
        subject: body.subject.trim(),
        content: [{ type: "text/html", value: body.html_body }],
      }),
    });

    if (!sgRes.ok) {
      const sgError = await sgRes.text();
      console.error("SendGrid API error:", sgError);
      return errorResponse("Failed to send email via SendGrid", 502);
    }

    // Insert email record into the database
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert({
        org_id: orgId,
        contact_id: body.contact_id,
        lead_id: body.lead_id || null,
        type: body.type || "general",
        subject: body.subject.trim(),
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (emailError || !email) {
      console.error("Failed to insert email record:", emailError?.message);
      return errorResponse("Email sent but failed to save record", 500);
    }

    return jsonResponse({ id: email.id, status: "sent" }, 201);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
