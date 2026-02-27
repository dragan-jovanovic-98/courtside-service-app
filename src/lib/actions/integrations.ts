"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Disconnect a calendar integration and its calendar connections.
 * Blocks disconnection if any active campaign uses one of its calendars.
 */
export async function disconnectCalendar(integrationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check for active campaigns using calendars from this integration
  const { data: calConnections } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("integration_id", integrationId);

  if (calConnections && calConnections.length > 0) {
    const calIds = calConnections.map((c) => c.id);
    const { data: activeCampaigns } = await supabase
      .from("campaigns")
      .select("id, name")
      .in("calendar_connection_id", calIds)
      .in("status", ["active", "paused"]);

    if (activeCampaigns && activeCampaigns.length > 0) {
      const names = activeCampaigns.map((c) => c.name).join(", ");
      return {
        error: `Cannot disconnect: active campaigns use this calendar (${names}). Reassign them first.`,
      };
    }
  }

  // Delete calendar connections (cascades from integration delete won't work here since we update, not delete)
  if (calConnections && calConnections.length > 0) {
    const calIds = calConnections.map((c) => c.id);

    // Clear calendar_connection_id from campaigns that reference these calendars
    await supabase
      .from("campaigns")
      .update({ calendar_connection_id: null })
      .in("calendar_connection_id", calIds);

    // Delete the calendar connections
    await supabase
      .from("calendar_connections")
      .delete()
      .eq("integration_id", integrationId);
  }

  // Update integration to disconnected (preserve the row for history)
  const { error } = await supabase
    .from("integrations")
    .update({
      status: "disconnected",
      config: null,
      connected_at: null,
    })
    .eq("id", integrationId);

  if (error) return { error: error.message };

  revalidatePath("/settings/integrations");
  return { success: true };
}

/**
 * Disconnect CRM integration and clear all CRM record IDs on contacts.
 */
export async function disconnectCrm(integrationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the user's org_id
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "User profile not found" };

  // Clear crm_provider and crm_record_id on all contacts in the org
  await supabase
    .from("contacts")
    .update({ crm_provider: null, crm_record_id: null })
    .eq("org_id", profile.org_id);

  // Update integration to disconnected
  const { error } = await supabase
    .from("integrations")
    .update({
      status: "disconnected",
      config: null,
      connected_at: null,
    })
    .eq("id", integrationId);

  if (error) return { error: error.message };

  revalidatePath("/settings/integrations");
  return { success: true };
}

/**
 * Update CRM activity sync toggles.
 */
export async function updateCrmSyncToggles(
  integrationId: string,
  toggles: {
    sync_calls?: boolean;
    sync_sms_sent?: boolean;
    sync_sms_received?: boolean;
    sync_emails?: boolean;
    sync_appointments?: boolean;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch current config
  const { data: integration, error: fetchError } = await supabase
    .from("integrations")
    .select("config")
    .eq("id", integrationId)
    .single();

  if (fetchError || !integration) return { error: "Integration not found" };

  const config = (integration.config ?? {}) as Record<string, unknown>;
  const updatedConfig = { ...config, ...toggles };

  const { error } = await supabase
    .from("integrations")
    .update({ config: updatedConfig })
    .eq("id", integrationId);

  if (error) return { error: error.message };

  revalidatePath("/settings/integrations");
  return { success: true };
}
