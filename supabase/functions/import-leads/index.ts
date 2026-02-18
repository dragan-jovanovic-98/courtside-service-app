import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase-client.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { getAuthContext } from "../_shared/auth.ts";

interface CsvRow {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  company: string;
  source: string;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // Already has country code or non-US — return with + prefix
  return digits.startsWith("+") ? raw.trim() : `+${digits}`;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length !== headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    // Phone is required
    if (!row.phone) continue;

    rows.push({
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      phone: row.phone,
      email: row.email || "",
      company: row.company || "",
      source: row.source || "",
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, orgId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    // Get campaign_id from query param or JSON wrapper
    const url = new URL(req.url);
    let campaignId = url.searchParams.get("campaign_id");

    const contentType = req.headers.get("content-type") || "";
    let csvText: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      campaignId = campaignId || body.campaign_id;
      csvText = body.csv;
      if (!csvText) {
        return errorResponse("Missing csv field in JSON body", 400);
      }
    } else {
      // Assume text/csv
      csvText = await req.text();
    }

    if (!campaignId) {
      return errorResponse("campaign_id is required", 400);
    }

    // Verify campaign belongs to the user's org
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return errorResponse("Campaign not found", 404);
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return errorResponse("No valid rows found in CSV", 400);
    }

    // Fetch DNC list for this org
    const phones = rows.map((r) => normalizePhone(r.phone));
    const { data: dncEntries } = await supabase
      .from("dnc_list")
      .select("phone")
      .in("phone", phones);

    const dncSet = new Set((dncEntries || []).map((d: { phone: string }) => d.phone));

    let imported = 0;
    let duplicates = 0;
    let dncExcluded = 0;

    for (const row of rows) {
      const phone = normalizePhone(row.phone);

      // Skip DNC numbers
      if (dncSet.has(phone)) {
        dncExcluded++;
        continue;
      }

      // Upsert contact (unique on org_id + phone — RLS scopes to org)
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .upsert(
          {
            org_id: orgId,
            first_name: row.first_name,
            last_name: row.last_name,
            phone,
            email: row.email || null,
            company: row.company || null,
            source: row.source || null,
          },
          { onConflict: "org_id,phone" }
        )
        .select("id")
        .single();

      if (contactError || !contact) {
        // Skip this row on error
        continue;
      }

      // Insert lead (unique on contact_id + campaign_id)
      const { error: leadError } = await supabase.from("leads").insert({
        org_id: orgId,
        contact_id: contact.id,
        campaign_id: campaignId,
        status: "new",
      });

      if (leadError) {
        // Duplicate constraint violation → count as duplicate
        if (leadError.code === "23505") {
          duplicates++;
        }
        continue;
      }

      imported++;
    }

    return jsonResponse({ imported, duplicates, dnc_excluded: dncExcluded });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse((error as Error).message, 500);
  }
});
