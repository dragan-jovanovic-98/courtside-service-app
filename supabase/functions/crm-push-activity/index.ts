import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface PushRequest {
  activity_type: "call" | "appointment";
  record_id: string; // calls.id or appointments.id
  org_id: string;
  contact_id: string;
}

// ── Auth helper ────────────────────────────────────────────────────

function verifyServiceAuth(req: Request): void {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");

  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  if (webhookSecret && token === webhookSecret) return;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) return;

  // Decode JWT for legacy vault token
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

// ── HubSpot API base ──────────────────────────────────────────────

const HUBSPOT_API = "https://api.hubapi.com";

// ── HubSpot engagement creators ───────────────────────────────────

async function createHubSpotCall(
  accessToken: string,
  crmRecordId: string,
  callData: {
    summary: string;
    duration_seconds: number;
    direction: string;
    timestamp: string;
    recording_url?: string;
  }
): Promise<string> {
  // Create the call engagement
  const body: Record<string, unknown> = {
    hs_call_body: callData.summary,
    hs_call_duration: String(callData.duration_seconds * 1000), // HubSpot uses milliseconds
    hs_call_direction: callData.direction === "inbound" ? "INBOUND" : "OUTBOUND",
    hs_call_status: "COMPLETED",
    hs_timestamp: callData.timestamp,
  };

  if (callData.recording_url) {
    body.hs_call_recording_url = callData.recording_url;
  }

  const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: body }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot call creation failed: ${err}`);
  }

  const data = await response.json();
  const engagementId = data.id;

  // Associate with contact
  await associateEngagement(accessToken, "calls", engagementId, crmRecordId);

  return engagementId;
}

async function createHubSpotMeeting(
  accessToken: string,
  crmRecordId: string,
  meetingData: {
    title: string;
    start_time: string;
    end_time: string;
    body: string;
  }
): Promise<string> {
  const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_meeting_title: meetingData.title,
        hs_meeting_start_time: meetingData.start_time,
        hs_meeting_end_time: meetingData.end_time,
        hs_meeting_body: meetingData.body,
        hs_timestamp: meetingData.start_time,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot meeting creation failed: ${err}`);
  }

  const data = await response.json();
  const engagementId = data.id;

  // Associate with contact
  await associateEngagement(accessToken, "meetings", engagementId, crmRecordId);

  return engagementId;
}

async function createHubSpotNote(
  accessToken: string,
  crmRecordId: string,
  noteData: {
    body: string;
    timestamp: string;
  }
): Promise<string> {
  const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/notes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_note_body: noteData.body,
        hs_timestamp: noteData.timestamp,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HubSpot note creation failed: ${err}`);
  }

  const data = await response.json();
  const engagementId = data.id;

  await associateEngagement(accessToken, "notes", engagementId, crmRecordId);

  return engagementId;
}

// ── Association helper ────────────────────────────────────────────

async function associateEngagement(
  accessToken: string,
  objectType: string,
  engagementId: string,
  contactId: string
): Promise<void> {
  const response = await fetch(
    `${HUBSPOT_API}/crm/v4/objects/${objectType}/${engagementId}/associations/contacts/${contactId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: objectType === "calls" ? 194 :
                             objectType === "meetings" ? 200 :
                             objectType === "notes" ? 202 :
                             objectType === "emails" ? 198 : 0,
        },
      ]),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`HubSpot association failed (${objectType} → contact):`, err);
    // Non-fatal — engagement was created, just not linked
  }
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

    const body: PushRequest = await req.json();
    const { activity_type, record_id, org_id, contact_id } = body;

    if (!activity_type || !record_id || !org_id || !contact_id) {
      return errorResponse(
        "Missing required fields: activity_type, record_id, org_id, contact_id",
        400
      );
    }

    const supabase = createServiceClient();

    // ── Check contact has CRM record ID ──
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, crm_provider, crm_record_id")
      .eq("id", contact_id)
      .single();

    if (!contact?.crm_record_id || contact.crm_provider !== "hubspot") {
      return jsonResponse({
        pushed: false,
        reason: "contact_not_crm_linked",
      });
    }

    // ── Check org has connected CRM with sync enabled ──
    const { data: integration } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("org_id", org_id)
      .eq("service_type", "crm")
      .eq("service_name", "hubspot")
      .eq("status", "connected")
      .maybeSingle();

    if (!integration) {
      return jsonResponse({
        pushed: false,
        reason: "no_crm_connected",
      });
    }

    const config = integration.config as Record<string, unknown>;

    // Check if the relevant sync toggle is enabled
    const toggleKey = activity_type === "call" ? "sync_calls" : "sync_appointments";
    if (config[toggleKey] === false) {
      return jsonResponse({
        pushed: false,
        reason: `sync_disabled_for_${activity_type}`,
      });
    }

    // ── Get valid access token ──
    const accessToken = await getValidAccessToken(integration.id, "hubspot");

    if (!accessToken) {
      await logActivity(supabase, {
        org_id,
        contact_id,
        crm_provider: "hubspot",
        activity_type,
        status: "failed",
        error_message: "Token refresh failed",
      });

      return jsonResponse({
        pushed: false,
        reason: "token_refresh_failed",
      });
    }

    // ── Execute push based on activity type ──
    let engagementId: string;
    let payload: Record<string, unknown>;

    try {
      switch (activity_type) {
        case "call": {
          const { data: call } = await supabase
            .from("calls")
            .select(
              "id, ai_summary, duration_seconds, direction, started_at, recording_url, campaign_id"
            )
            .eq("id", record_id)
            .single();

          if (!call) {
            return errorResponse("Call not found", 404);
          }

          payload = {
            summary: call.ai_summary ?? "Call via Courtside AI",
            duration_seconds: call.duration_seconds ?? 0,
            direction: call.direction ?? "outbound",
            timestamp: call.started_at,
            recording_url: call.recording_url,
          };

          engagementId = await createHubSpotCall(
            accessToken,
            contact.crm_record_id,
            payload as {
              summary: string;
              duration_seconds: number;
              direction: string;
              timestamp: string;
              recording_url?: string;
            }
          );
          break;
        }

        case "appointment": {
          const { data: appointment } = await supabase
            .from("appointments")
            .select(
              "id, scheduled_at, duration_minutes, notes, title, campaign_id"
            )
            .eq("id", record_id)
            .single();

          if (!appointment) {
            return errorResponse("Appointment not found", 404);
          }

          // Fetch campaign name for context
          let campaignName = "";
          if (appointment.campaign_id) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("name")
              .eq("id", appointment.campaign_id)
              .single();
            campaignName = campaign?.name ?? "";
          }

          const startTime = appointment.scheduled_at;
          const endTime = new Date(
            new Date(startTime).getTime() +
              (appointment.duration_minutes ?? 30) * 60_000
          ).toISOString();

          const meetingBody = [
            campaignName ? `Campaign: ${campaignName}` : "",
            appointment.notes ? `Notes: ${appointment.notes}` : "",
            "Booked via Courtside AI",
          ]
            .filter(Boolean)
            .join("\n");

          payload = {
            title:
              appointment.title ?? "Courtside AI Appointment",
            start_time: startTime,
            end_time: endTime,
            body: meetingBody,
          };

          engagementId = await createHubSpotMeeting(
            accessToken,
            contact.crm_record_id,
            payload as {
              title: string;
              start_time: string;
              end_time: string;
              body: string;
            }
          );
          break;
        }

        default:
          return errorResponse(`Unsupported activity type: ${activity_type}`, 400);
      }

      // ── Log success ──
      await logActivity(supabase, {
        org_id,
        contact_id,
        crm_provider: "hubspot",
        activity_type,
        crm_engagement_id: engagementId,
        status: "success",
        payload,
      });

      return jsonResponse({
        pushed: true,
        crm_engagement_id: engagementId,
        activity_type,
      });
    } catch (pushError) {
      console.error("CRM push error:", pushError);

      await logActivity(supabase, {
        org_id,
        contact_id,
        crm_provider: "hubspot",
        activity_type,
        status: "failed",
        error_message: pushError.message,
        payload,
      });

      return jsonResponse({
        pushed: false,
        reason: pushError.message,
      });
    }
  } catch (error) {
    console.error("crm-push-activity error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});

// ── Activity log helper ──

async function logActivity(
  supabase: ReturnType<typeof createServiceClient>,
  data: {
    org_id: string;
    contact_id: string;
    crm_provider: string;
    activity_type: string;
    crm_engagement_id?: string;
    status: string;
    error_message?: string;
    payload?: Record<string, unknown>;
  }
) {
  await supabase.from("crm_activity_log").insert({
    org_id: data.org_id,
    contact_id: data.contact_id,
    crm_provider: data.crm_provider,
    activity_type: data.activity_type,
    crm_engagement_id: data.crm_engagement_id ?? null,
    status: data.status,
    error_message: data.error_message ?? null,
    payload: data.payload ?? null,
  });
}
