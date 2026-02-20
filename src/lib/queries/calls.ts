import { createClient } from "@/lib/supabase/server";
import type { CallListItem } from "@/types";
import { fullName, formatDuration, formatDateShort } from "@/lib/format";

export async function getCalls(): Promise<CallListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("calls")
    .select(
      "id, created_at, direction, duration_seconds, outcome, ai_summary, transcript_text, recording_url, contacts(first_name, last_name, phone), agents(name), campaigns(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const contact = row.contacts as {
      first_name: string;
      last_name: string | null;
      phone: string;
    } | null;
    const agent = row.agents as { name: string } | null;
    const campaign = row.campaigns as { name: string } | null;

    return {
      id: row.id as string,
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
