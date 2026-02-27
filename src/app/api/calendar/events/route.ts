import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/calendar/events
 *
 * Proxies requests to the fetch-external-calendar-events Edge Function.
 * Query params: calendar_connection_id, start_date, end_date, timezone (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const calendarConnectionId = searchParams.get("calendar_connection_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const timezone = searchParams.get("timezone");

    if (!calendarConnectionId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: calendar_connection_id, start_date, end_date" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const params = new URLSearchParams({
      calendar_connection_id: calendarConnectionId,
      start_date: startDate,
      end_date: endDate,
    });
    if (timezone) {
      params.set("timezone", timezone);
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-external-calendar-events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Calendar events API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
