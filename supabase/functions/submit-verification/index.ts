import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, errorResponse } from "../_shared/response.ts";

function getUserIdFromJwt(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Decode the payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    // Decode user ID from the JWT (already validated by Supabase gateway)
    const userId = getUserIdFromJwt(authHeader);
    if (!userId) {
      return errorResponse("Invalid token", 401);
    }

    // Use service role client for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up user's org
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup failed:", profileError?.message);
      return errorResponse("User profile not found", 401);
    }

    const orgId = profile.org_id;

    const body = await req.json();
    const {
      legal_business_name,
      dba_name,
      business_type,
      industry,
      business_address,
      province_or_state,
      country,
      tax_id,
      state_registration_number,
      registration_type,
      rep_full_name,
      rep_email,
      rep_phone,
      rep_job_title,
      rep_dob,
    } = body;

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
          tax_id: tax_id ?? null,
          state_registration_number: state_registration_number ?? null,
          registration_type: registration_type ?? null,
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
    console.error("submit-verification error:", error);
    return errorResponse(error.message, 500);
  }
});
