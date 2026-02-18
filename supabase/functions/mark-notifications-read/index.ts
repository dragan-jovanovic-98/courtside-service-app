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
    const { userId } = await getAuthContext(req);
    const supabase = createUserClient(req);

    const { notification_id, all } = await req.json();

    if (!notification_id && !all) {
      return errorResponse("Provide either notification_id or all: true", 400);
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    if (notification_id) {
      // Mark a single notification as read
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("id", notification_id)
        .eq("user_id", userId)
        .eq("is_read", false)
        .select();

      if (error) {
        return errorResponse(error.message, 500);
      }

      updatedCount = data?.length ?? 0;
    } else if (all) {
      // Mark all unread notifications as read
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .eq("user_id", userId)
        .eq("is_read", false)
        .select();

      if (error) {
        return errorResponse(error.message, 500);
      }

      updatedCount = data?.length ?? 0;
    }

    return jsonResponse({ updated_count: updatedCount });
  } catch (error) {
    if (error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    return errorResponse(error.message, 500);
  }
});
