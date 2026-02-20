import { createClient } from "@/lib/supabase/server";
import type { LeadListItem, TimelineEvent, LeadWithDetails } from "@/types";
import { fullName } from "@/lib/format";
import { formatRelativeTime, formatDateShort, formatDuration } from "@/lib/format";

export async function getLeads(): Promise<LeadListItem[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(
      "id, contact_id, campaign_id, status, last_call_outcome, last_activity_at, contacts(first_name, last_name, phone, email, company), campaigns(name, agent_id)"
    )
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const contact = row.contacts as {
      first_name: string;
      last_name: string | null;
      phone: string;
      email: string | null;
      company: string | null;
    } | null;
    const campaign = row.campaigns as { name: string; agent_id: string | null } | null;

    return {
      id: row.id as string,
      contact_id: row.contact_id as string,
      campaign_id: row.campaign_id as string,
      agent_id: campaign?.agent_id ?? null,
      name: contact ? fullName(contact.first_name, contact.last_name) : "Unknown",
      phone: contact?.phone ?? "",
      email: contact?.email ?? null,
      company: contact?.company ?? null,
      status: row.status as string,
      outcome: row.last_call_outcome as string | null,
      lastActivity: row.last_activity_at
        ? formatRelativeTime(row.last_activity_at as string)
        : "—",
      campaign: campaign?.name ?? "—",
    };
  });
}

export async function getLeadById(
  id: string
): Promise<LeadWithDetails | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(
      "*, contacts(*), campaigns(id, name, status), calls(*), appointments(*)"
    )
    .eq("id", id)
    .single();

  return data as LeadWithDetails | null;
}

export async function getLeadTimeline(
  leadId: string
): Promise<TimelineEvent[]> {
  const supabase = await createClient();

  // Fetch calls, sms, and emails for this lead in parallel
  const [callsRes, smsRes, emailsRes] = await Promise.all([
    supabase
      .from("calls")
      .select("id, created_at, duration_seconds, outcome, ai_summary")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("sms_messages")
      .select("id, created_at, body, direction")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("emails")
      .select("id, created_at, subject, type")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events: TimelineEvent[] = [];

  for (const c of callsRes.data ?? []) {
    const dur = c.duration_seconds ? formatDuration(c.duration_seconds) : "0:00";
    events.push({
      type: "call",
      time: formatDateShort(c.created_at),
      title: `AI call — ${dur} — ${c.outcome ?? "Unknown"}`,
      detail: c.ai_summary ?? "",
      createdAt: c.created_at,
    });
  }

  for (const s of smsRes.data ?? []) {
    events.push({
      type: "sms",
      time: formatDateShort(s.created_at),
      title:
        s.direction === "inbound" ? "SMS received" : "SMS sent",
      detail: s.body ?? "",
      createdAt: s.created_at,
    });
  }

  for (const e of emailsRes.data ?? []) {
    events.push({
      type: "email",
      time: formatDateShort(e.created_at),
      title: e.subject ?? "Email",
      detail: e.type ?? "",
      createdAt: e.created_at,
    });
  }

  events.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return events;
}

export async function getLeadStats() {
  const supabase = await createClient();

  const [totalRes, followUpRes, apptRes, newRes] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in("status", ["contacted", "interested"]),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "appt_set"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  return {
    total: totalRes.count ?? 0,
    followUps: followUpRes.count ?? 0,
    appointments: apptRes.count ?? 0,
    new: newRes.count ?? 0,
  };
}
