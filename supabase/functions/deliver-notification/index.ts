import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

// ── Types ──────────────────────────────────────────────────────────

interface NotificationRecord {
  id: string;
  org_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

interface TriggerPayload {
  type: "INSERT";
  record: NotificationRecord;
}

interface NotificationPreferences {
  [notificationType: string]: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

// ── Auth helper ────────────────────────────────────────────────────

// Supabase Edge Functions now use sb_secret_ format for SUPABASE_SERVICE_ROLE_KEY,
// but DB triggers send the legacy JWT from vault. We decode the JWT and check the
// role claim instead of doing a direct string comparison.

function verifyServiceAuth(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");

  // Check against N8N webhook secret (simple string match)
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  if (webhookSecret && token === webhookSecret) return;

  // Check against new-format service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) return;

  // Decode JWT and verify it has service_role claim
  // (handles legacy JWT sent by DB triggers via vault)
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === "service_role") return;
    }
  } catch {
    // Not a valid JWT
  }

  throw new Error("Unauthorized");
}

// ── Email via SendGrid ─────────────────────────────────────────────

async function sendEmail(
  toEmail: string,
  toName: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@courtsideai.com";

  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set — skipping email delivery");
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: toName }] }],
      from: { email: fromEmail, name: "Courtside AI" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SendGrid error:", err);
    throw new Error(`SendGrid failed: ${res.status}`);
  }
}

// ── SMS via Twilio ─────────────────────────────────────────────────

async function sendSms(toPhone: string, body: string): Promise<void> {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!twilioSid || !twilioAuth || !twilioFrom) {
    console.warn("Twilio env vars not fully set — skipping SMS delivery");
    return;
  }

  const params = new URLSearchParams();
  params.append("To", toPhone);
  params.append("From", twilioFrom);
  params.append("Body", body);

  const res = await fetch(
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

  if (!res.ok) {
    const err = await res.text();
    console.error("Twilio error:", err);
    throw new Error(`Twilio failed: ${res.status}`);
  }
}

// ── HTML email template ────────────────────────────────────────────

function buildNotificationEmail(title: string, body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: #0e1117; border-radius: 8px; padding: 24px; color: #e8eaed;">
        <h2 style="margin: 0 0 8px 0; font-size: 16px; color: #34d399;">${title}</h2>
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: rgba(255,255,255,0.7);">${body}</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 16px 0;" />
        <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.3);">Courtside AI — You can manage notification preferences in Settings.</p>
      </div>
    </div>
  `;
}

// ── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    verifyServiceAuth(req);

    const payload: TriggerPayload = await req.json();
    const { record } = payload;

    if (!record?.user_id || !record?.type) {
      return errorResponse("Invalid payload: missing record.user_id or record.type", 400);
    }

    const supabase = createServiceClient();

    // ── Look up user's notification preferences ──
    const { data: prefRow } = await supabase
      .from("notification_preferences")
      .select("preferences")
      .eq("user_id", record.user_id)
      .single();

    // Defaults: email enabled, SMS disabled
    const prefs: NotificationPreferences = prefRow?.preferences ?? {};
    const typePrefs = prefs[record.type] ?? { email: true, sms: false };

    // ── Get user details for delivery ──
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, phone, first_name, last_name")
      .eq("id", record.user_id)
      .single();

    if (userError || !user) {
      console.error("User not found for notification delivery:", record.user_id);
      return errorResponse("User not found", 404);
    }

    const deliveryResults: { channel: string; status: string }[] = [];

    // ── Email delivery ──
    if (typePrefs.email && user.email) {
      try {
        const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";
        const htmlBody = buildNotificationEmail(record.title, record.body);
        await sendEmail(user.email, userName, record.title, htmlBody);
        deliveryResults.push({ channel: "email", status: "sent" });
      } catch (err) {
        console.error("Email delivery failed:", (err as Error).message);
        deliveryResults.push({ channel: "email", status: "failed" });
      }
    }

    // ── SMS delivery ──
    if (typePrefs.sms && user.phone) {
      try {
        const smsBody = `${record.title}\n${record.body}`;
        await sendSms(user.phone, smsBody);
        deliveryResults.push({ channel: "sms", status: "sent" });
      } catch (err) {
        console.error("SMS delivery failed:", (err as Error).message);
        deliveryResults.push({ channel: "sms", status: "failed" });
      }
    }

    // In-app delivery is automatic — the row already exists in `notifications`

    return jsonResponse({
      notification_id: record.id,
      delivered: deliveryResults,
    });
  } catch (error) {
    console.error("deliver-notification error:", error);
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message ?? "Internal server error", 500);
  }
});
