import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase-client.ts";
import { getAuthContext } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getValidAccessToken } from "../_shared/oauth.ts";

// ── Types ──────────────────────────────────────────────────────────

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    phone?: string;
    email?: string;
    company?: string;
    [key: string]: string | undefined;
  };
}

interface ImportResult {
  created: number;
  updated: number;
  skipped_no_phone: number;
  leads_created: number;
  errors: number;
}

// ── Constants ──────────────────────────────────────────────────────

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const HUBSPOT_PAGE_SIZE = 100;
const HUBSPOT_RATE_LIMIT_DELAY_MS = 150; // ~6-7 req/sec stays well under 100/10s

// ── HubSpot API helpers ────────────────────────────────────────────

async function fetchHubSpotLists(
  accessToken: string
): Promise<Array<{ listId: string; name: string; contactCount: number }>> {
  const lists: Array<{ listId: string; name: string; contactCount: number }> = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/lists`);
    url.searchParams.set("count", "250");
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HubSpot list fetch failed: ${err}`);
    }

    const data = await response.json();
    const items = data.lists ?? [];

    for (const list of items) {
      lists.push({
        listId: String(list.listId),
        name: list.name ?? `List ${list.listId}`,
        contactCount: list.size ?? 0,
      });
    }

    hasMore = data["has-more"] === true;
    offset = data.offset ?? offset + 250;
  }

  return lists;
}

async function fetchHubSpotContactsFromList(
  accessToken: string,
  listId: string
): Promise<HubSpotContact[]> {
  // First get membership IDs from the list
  const contacts: HubSpotContact[] = [];
  let after: string | undefined;
  let hasMore = true;

  // Fetch list memberships (returns contact IDs)
  const contactIds: string[] = [];

  while (hasMore) {
    const url = new URL(
      `${HUBSPOT_API_BASE}/crm/v3/lists/${listId}/memberships`
    );
    if (after) url.searchParams.set("after", after);
    url.searchParams.set("limit", String(HUBSPOT_PAGE_SIZE));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HubSpot list membership fetch failed: ${err}`);
    }

    const data = await response.json();
    const results = data.results ?? [];
    for (const r of results) {
      contactIds.push(String(r.recordId ?? r));
    }

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      hasMore = false;
    }

    await delay(HUBSPOT_RATE_LIMIT_DELAY_MS);
  }

  // Batch fetch contact details
  for (let i = 0; i < contactIds.length; i += HUBSPOT_PAGE_SIZE) {
    const batch = contactIds.slice(i, i + HUBSPOT_PAGE_SIZE);

    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/batch/read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: ["firstname", "lastname", "phone", "email", "company"],
          inputs: batch.map((id) => ({ id })),
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`HubSpot batch read failed: ${err}`);
      continue;
    }

    const data = await response.json();
    contacts.push(...(data.results ?? []));
    await delay(HUBSPOT_RATE_LIMIT_DELAY_MS);
  }

  return contacts;
}

async function fetchAllHubSpotContacts(
  accessToken: string
): Promise<HubSpotContact[]> {
  const contacts: HubSpotContact[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`);
    url.searchParams.set("limit", String(HUBSPOT_PAGE_SIZE));
    url.searchParams.set(
      "properties",
      "firstname,lastname,phone,email,company"
    );
    if (after) url.searchParams.set("after", after);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HubSpot contacts fetch failed: ${err}`);
    }

    const data = await response.json();
    contacts.push(...(data.results ?? []));

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      hasMore = false;
    }

    await delay(HUBSPOT_RATE_LIMIT_DELAY_MS);
  }

  return contacts;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Upsert logic ──────────────────────────────────────────────────

async function upsertContacts(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  hubspotContacts: HubSpotContact[],
  campaignId?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped_no_phone: 0,
    leads_created: 0,
    errors: 0,
  };

  for (const hc of hubspotContacts) {
    const phone = normalizePhone(hc.properties.phone);

    if (!phone) {
      result.skipped_no_phone++;
      continue;
    }

    try {
      // Check if contact already exists by (org_id, phone)
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, crm_record_id")
        .eq("org_id", orgId)
        .eq("phone", phone)
        .maybeSingle();

      let contactId: string;

      if (existing) {
        // Update existing contact — clear cooldown so they're immediately callable
        await supabase
          .from("contacts")
          .update({
            first_name: hc.properties.firstname ?? existing.first_name,
            last_name: hc.properties.lastname || null,
            email: hc.properties.email || null,
            company: hc.properties.company || null,
            crm_provider: "hubspot",
            crm_record_id: hc.id,
            cooldown_until: null,
          })
          .eq("id", existing.id);

        contactId = existing.id;
        result.updated++;
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabase
          .from("contacts")
          .insert({
            org_id: orgId,
            first_name: hc.properties.firstname ?? "Unknown",
            last_name: hc.properties.lastname || null,
            email: hc.properties.email || null,
            phone,
            company: hc.properties.company || null,
            source: "crm_import",
            crm_provider: "hubspot",
            crm_record_id: hc.id,
          })
          .select("id")
          .single();

        if (insertError || !newContact) {
          console.error("Contact insert error:", insertError?.message);
          result.errors++;
          continue;
        }

        contactId = newContact.id;
        result.created++;
      }

      // Create lead if campaign_id provided
      if (campaignId) {
        // Check if lead already exists for this contact + campaign
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("contact_id", contactId)
          .eq("campaign_id", campaignId)
          .maybeSingle();

        if (!existingLead) {
          const { error: leadError } = await supabase
            .from("leads")
            .insert({
              org_id: orgId,
              contact_id: contactId,
              campaign_id: campaignId,
              status: "new",
              import_source: "crm",
            });

          if (!leadError) {
            result.leads_created++;
          } else {
            console.error("Lead insert error:", leadError.message);
          }
        }
      }
    } catch (err) {
      console.error("Upsert error for contact:", hc.id, err);
      result.errors++;
    }
  }

  return result;
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  // Strip non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : null;
}

// ── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);

    if (req.method === "GET") {
      // ── GET: List available import sources (HubSpot lists) ──
      return await handleListSources(orgId);
    }

    if (req.method === "POST") {
      // ── POST: Execute import ──
      const body = await req.json();
      return await handleImport(orgId, body);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    console.error("crm-import-contacts error:", error);
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message ?? "Internal server error", 500);
  }
});

// ── GET handler: list import sources ──

async function handleListSources(orgId: string) {
  const supabase = createServiceClient();

  // Find connected CRM integration
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, service_name, config")
    .eq("org_id", orgId)
    .eq("service_type", "crm")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration) {
    return errorResponse("No CRM connected", 404);
  }

  const accessToken = await getValidAccessToken(
    integration.id,
    "hubspot"
  );

  if (!accessToken) {
    return errorResponse("CRM authentication expired. Please reconnect.", 401);
  }

  // Fetch HubSpot lists
  const lists = await fetchHubSpotLists(accessToken);

  return jsonResponse({
    provider: integration.service_name,
    sources: [
      {
        type: "all_contacts",
        name: "All Contacts",
        description: "Import all contacts from HubSpot",
      },
      ...lists.map((l) => ({
        type: "list",
        id: l.listId,
        name: l.name,
        contact_count: l.contactCount,
      })),
    ],
  });
}

// ── POST handler: execute import ──

async function handleImport(
  orgId: string,
  body: {
    source_type: "all_contacts" | "list";
    list_id?: string;
    campaign_id?: string;
    preview_only?: boolean;
  }
) {
  const { source_type, list_id, campaign_id, preview_only } = body;

  if (!source_type) {
    return errorResponse("Missing required field: source_type", 400);
  }

  if (source_type === "list" && !list_id) {
    return errorResponse("list_id is required when source_type is 'list'", 400);
  }

  const supabase = createServiceClient();

  // Find connected CRM integration
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, service_name, config")
    .eq("org_id", orgId)
    .eq("service_type", "crm")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration) {
    return errorResponse("No CRM connected", 404);
  }

  const accessToken = await getValidAccessToken(integration.id, "hubspot");

  if (!accessToken) {
    return errorResponse("CRM authentication expired. Please reconnect.", 401);
  }

  // Fetch contacts from HubSpot
  let contacts: HubSpotContact[];

  if (source_type === "list" && list_id) {
    contacts = await fetchHubSpotContactsFromList(accessToken, list_id);
  } else {
    contacts = await fetchAllHubSpotContacts(accessToken);
  }

  // Count contacts with/without phone for preview
  const withPhone = contacts.filter((c) => normalizePhone(c.properties.phone));
  const withoutPhone = contacts.length - withPhone.length;

  if (preview_only) {
    // Check how many already exist in Courtside
    const phones = withPhone
      .map((c) => normalizePhone(c.properties.phone)!)
      .filter(Boolean);

    let existingCount = 0;
    if (phones.length > 0) {
      // Check in batches of 100
      for (let i = 0; i < phones.length; i += 100) {
        const batch = phones.slice(i, i + 100);
        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .in("phone", batch);
        existingCount += count ?? 0;
      }
    }

    return jsonResponse({
      total: contacts.length,
      with_phone: withPhone.length,
      without_phone: withoutPhone,
      already_in_courtside: existingCount,
      new_contacts: withPhone.length - existingCount,
      preview: withPhone.slice(0, 50).map((c) => ({
        hubspot_id: c.id,
        first_name: c.properties.firstname ?? "",
        last_name: c.properties.lastname ?? "",
        phone: c.properties.phone ?? "",
        email: c.properties.email ?? "",
        company: c.properties.company ?? "",
      })),
    });
  }

  // Execute the import
  const result = await upsertContacts(supabase, orgId, contacts, campaign_id);

  return jsonResponse({
    success: true,
    provider: "hubspot",
    source_type,
    ...(list_id && { list_id }),
    ...(campaign_id && { campaign_id }),
    result,
  });
}
