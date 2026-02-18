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
      legal_business_name,
      dba_name,
      business_type,
      industry,
      business_address,
      province_or_state,
      country,
      website_url,
      tax_id,
      state_registration_number,
      rep_full_name,
      rep_email,
      rep_phone,
      rep_job_title,
      rep_dob,
    } = body;

    // Validate required field
    if (
      !legal_business_name ||
      typeof legal_business_name !== "string" ||
      legal_business_name.trim().length === 0
    ) {
      return errorResponse("legal_business_name is required");
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("verification")
      .upsert(
        {
          org_id: orgId,
          status: "in_progress",
          submitted_at: now,
          legal_business_name: legal_business_name.trim(),
          dba_name: dba_name ?? null,
          business_type: business_type ?? null,
          industry: industry ?? null,
          business_address: business_address ?? null,
          province_or_state: province_or_state ?? null,
          country: country ?? null,
          website_url: website_url ?? null,
          tax_id: tax_id ?? null,
          state_registration_number: state_registration_number ?? null,
          rep_full_name: rep_full_name ?? null,
          rep_email: rep_email ?? null,
          rep_phone: rep_phone ?? null,
          rep_job_title: rep_job_title ?? null,
          rep_dob: rep_dob ?? null,
        },
        { onConflict: "org_id" }
      )
      .select("id, status")
      .single();

    if (error) {
      console.error("Failed to upsert verification:", error);
      return errorResponse("Failed to submit verification", 500);
    }

    return jsonResponse({ id: data.id, status: data.status });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    console.error("submit-verification error:", error);
    return errorResponse(error.message, 500);
  }
});
