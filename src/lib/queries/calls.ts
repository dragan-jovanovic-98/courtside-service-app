import { createClient } from "@/lib/supabase/server";
import type { CallListItem } from "@/types";
import { fullName, formatDuration, formatDateShort } from "@/lib/format";

export interface CallFilters {
  outcome?: string;
  campaign?: string;
  direction?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getCalls(
  filters: CallFilters = {}
): Promise<{ data: CallListItem[]; totalCount: number }> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use inner join for campaigns when filtering by campaign name
  const campaignJoin =
    filters.campaign && filters.campaign !== "all"
      ? "campaigns!inner(name)"
      : "campaigns(name)";

  // Use inner join for contacts when searching
  const contactsJoin =
    filters.search
      ? "contacts!inner(first_name, last_name, phone)"
      : "contacts(first_name, last_name, phone)";

  let query = supabase
    .from("calls")
    .select(
      `id, lead_id, created_at, direction, duration_seconds, outcome, ai_summary, transcript_text, recording_url, ${contactsJoin}, agents(name), ${campaignJoin}`,
      { count: "exact" }
    );

  // Server-side filters
  if (filters.outcome && filters.outcome !== "all") {
    query = query.eq("outcome", filters.outcome);
  }
  if (filters.direction && filters.direction !== "all") {
    query = query.eq("direction", filters.direction);
  }
  if (filters.campaign && filters.campaign !== "all") {
    query = query.eq("campaigns.name", filters.campaign);
  }
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`,
      { referencedTable: "contacts" }
    );
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (!data) return { data: [], totalCount: 0 };

  const mapped = data.map((row: Record<string, unknown>) => {
    const contact = row.contacts as {
      first_name: string;
      last_name: string | null;
      phone: string;
    } | null;
    const agent = row.agents as { name: string } | null;
    const campaign = row.campaigns as { name: string } | null;

    return {
      id: row.id as string,
      leadId: (row.lead_id as string | null) ?? null,
      date: formatDateShort(row.created_at as string),
      name: contact
        ? fullName(contact.first_name, contact.last_name)
        : "Unknown",
      phone: contact?.phone ?? "",
      agent: agent?.name ?? "—",
      duration: row.duration_seconds
        ? formatDuration(row.duration_seconds as number)
        : "0:00",
      outcome: (row.outcome as string) ?? "—",
      campaign: campaign?.name ?? "—",
      direction: row.direction as string,
      aiSummary: row.ai_summary as string | null,
      transcriptText: row.transcript_text as string | null,
      recordingUrl: row.recording_url as string | null,
    };
  });

  return { data: mapped, totalCount: count ?? 0 };
}

export async function getCallStats() {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalRes, todayRes, connectedRes, bookedRes] = await Promise.all([
    supabase.from("calls").select("id", { count: "exact", head: true }),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .not("outcome", "in", "(no_answer,voicemail)"),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("outcome", "booked"),
  ]);

  return {
    total: totalRes.count ?? 0,
    today: todayRes.count ?? 0,
    connected: connectedRes.count ?? 0,
    booked: bookedRes.count ?? 0,
  };
}
