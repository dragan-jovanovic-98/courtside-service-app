/**
 * Seed script — populates Supabase with realistic mortgage brokerage demo data.
 *
 * Usage:  npx tsx scripts/seed.ts
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Uses service role key to bypass RLS.
 */

import "dotenv/config";
import { resolve } from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Load .env.local (dotenv/config only loads .env)
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_ORG_NAME = "Apex Mortgage Group";

// ─── Helpers ───────────────────────────────────────────────────

function daysAgo(n: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function today(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function tomorrow(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function nextWeek(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Fixed IDs so we can reference across tables ────────────────

const orgId = randomUUID();
const agentSarahId = randomUUID();
const agentMikeId = randomUUID();
const campaignQ1Id = randomUUID();
const campaignInsuranceId = randomUUID();
const campaignSpringId = randomUUID();

// ─── Contact data ───────────────────────────────────────────────

const CONTACTS = [
  { first: "James", last: "Chen", phone: "+14165550101", email: "james.chen@gmail.com", company: "Chen Financial" },
  { first: "Priya", last: "Sharma", phone: "+14165550102", email: "priya.s@outlook.com", company: null },
  { first: "David", last: "Williams", phone: "+14165550103", email: "d.williams@rogers.com", company: "Williams & Co" },
  { first: "Maria", last: "Santos", phone: "+16475550104", email: "maria.santos@yahoo.com", company: null },
  { first: "Robert", last: "Kim", phone: "+14165550105", email: "robert.kim@gmail.com", company: "Kimco Realty" },
  { first: "Sarah", last: "Thompson", phone: "+16475550106", email: "s.thompson@bell.net", company: null },
  { first: "Michael", last: "Patel", phone: "+14165550107", email: "m.patel@outlook.com", company: "Patel Properties" },
  { first: "Emily", last: "Jones", phone: "+16475550108", email: "emily.jones@gmail.com", company: null },
  { first: "Ahmed", last: "Hassan", phone: "+14165550109", email: "a.hassan@hotmail.com", company: "Hassan Investments" },
  { first: "Lisa", last: "Wang", phone: "+16475550110", email: "lisa.wang@gmail.com", company: null },
  { first: "Daniel", last: "Brown", phone: "+14165550111", email: "dan.brown@rogers.com", company: "Brown Advisory" },
  { first: "Jennifer", last: "Lee", phone: "+16475550112", email: "jen.lee@outlook.com", company: null },
  { first: "Kevin", last: "O'Brien", phone: "+14165550113", email: "kevin.obrien@gmail.com", company: null },
  { first: "Natasha", last: "Ivanova", phone: "+16475550114", email: "n.ivanova@bell.net", company: "Ivanova Group" },
  { first: "Chris", last: "Martinez", phone: "+14165550115", email: "chris.m@yahoo.com", company: null },
  { first: "Amanda", last: "Taylor", phone: "+16475550116", email: "a.taylor@gmail.com", company: "Taylor Homes" },
  { first: "Brian", last: "Wilson", phone: "+14165550117", email: "b.wilson@outlook.com", company: null },
  { first: "Samantha", last: "Davis", phone: "+14165550118", email: "sam.davis@rogers.com", company: null },
  { first: "Andrew", last: "Nakamura", phone: "+16475550119", email: "a.nakamura@gmail.com", company: "Nakamura Corp" },
  { first: "Rachel", last: "Green", phone: "+14165550120", email: "r.green@bell.net", company: null },
  { first: "Thomas", last: "Mueller", phone: "+16475550121", email: "t.mueller@outlook.com", company: "Mueller Real Estate" },
  { first: "Jessica", last: "Wright", phone: "+14165550122", email: "j.wright@gmail.com", company: null },
  { first: "Mark", last: "Robinson", phone: "+16475550123", email: "mark.r@yahoo.com", company: null },
  { first: "Olivia", last: "Clark", phone: "+14165550124", email: "olivia.clark@gmail.com", company: "Clark & Associates" },
  { first: "Ryan", last: "Anderson", phone: "+16475550125", email: "ryan.a@rogers.com", company: null },
  { first: "Stephanie", last: "Nguyen", phone: "+14165550126", email: "s.nguyen@outlook.com", company: null },
  { first: "Jason", last: "Scott", phone: "+16475550127", email: "jason.scott@gmail.com", company: "Scott Mortgages" },
  { first: "Michelle", last: "Park", phone: "+14165550128", email: "m.park@bell.net", company: null },
  { first: "Tyler", last: "Adams", phone: "+16475550129", email: "tyler.adams@yahoo.com", company: null },
  { first: "Lauren", last: "Foster", phone: "+14165550130", email: "l.foster@gmail.com", company: "Foster Financial" },
];

const contactIds = CONTACTS.map(() => randomUUID());

// ─── Call summaries ─────────────────────────────────────────────

const SUMMARIES = {
  booked: [
    { one: "Booked appointment to discuss refinancing options", full: "Discussed refinancing options for their 3-bedroom in Oakville. Currently at 5.2% with RBC. Interested in variable rate. Booked consultation for next week." },
    { one: "Scheduled mortgage pre-approval meeting", full: "First-time homebuyer looking in the $600-800K range in Mississauga. Has 15% down payment saved. Scheduled pre-approval meeting." },
    { one: "Booked renewal discussion appointment", full: "Mortgage renewal coming up in 3 months with TD. Currently at 4.8% fixed. Wants to explore options. Booked appointment to review alternatives." },
  ],
  interested: [
    { one: "Interested in rate comparison — will call back", full: "Has a 5-year fixed at 5.4% with Scotia. Interested in seeing what we can offer. Wants to discuss with spouse first, said they'd call back this week." },
    { one: "Wants info on HELOC options sent by email", full: "Looking to access home equity for renovations. Property valued at $1.1M, owes $450K. Requested HELOC info package by email." },
    { one: "Exploring pre-construction financing options", full: "Investor looking at pre-construction condos in downtown Toronto. Interested in our financing options for investment properties. Will review materials." },
  ],
  callback: [
    { one: "Requested callback after work hours", full: "Reached contact but they were at work. Asked to be called back after 6 PM. Seemed interested in discussing renewal options." },
    { one: "In a meeting — asked for callback tomorrow", full: "Brief conversation. Currently in meetings all day. Requested callback tomorrow morning between 9-11 AM." },
  ],
  voicemail: [
    { one: "Left voicemail — first attempt", full: "Left voicemail introducing our mortgage services and mentioning current competitive rates. First attempt." },
    { one: "Left voicemail — second attempt", full: "Second attempt. Left voicemail referencing previous message and offering a free rate comparison." },
  ],
  no_answer: [
    { one: "No answer — will retry", full: "Phone rang, no answer, no voicemail box available. Will retry." },
    { one: "No answer — rang out", full: "Rang through to end. No voicemail. Scheduled for retry." },
  ],
  not_interested: [
    { one: "Just renewed — not interested currently", full: "Contact just renewed their mortgage 2 months ago for 5 years. Not interested in any services at this time. May revisit in a year." },
    { one: "Happy with current lender", full: "Said they're happy with their current lender and rate. Not interested in exploring alternatives." },
  ],
};

// ─── Main seed function ─────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // 1. Find the auth user (needed for notifications FK)
  console.log("  → Looking up auth user...");
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUser = authData?.users?.[0];
  if (!authUser) {
    console.error("    No auth user found. Sign up via the app first, then run seed.");
    process.exit(1);
  }
  const userId = authUser.id;
  console.log(`    Found auth user ${userId} (${authUser.email})`);

  // 2. Clean up existing demo org
  await cleanUp();

  // 3. Organization
  console.log("  → Creating organization...");
  const { error: orgErr } = await supabase.from("organizations").insert({
    id: orgId,
    name: DEMO_ORG_NAME,
    industry: "Mortgage Brokerage",
    business_type: "Brokerage",
    country: "CA",
    address: "100 King St W, Suite 5600, Toronto, ON M5X 1C9",
    business_phone: "+14165551000",
    website: "https://apexmortgage.ca",
  });
  if (orgErr) throw new Error(`Org insert failed: ${orgErr.message}`);

  // 4. Ensure public.users row exists and is assigned to demo org
  console.log("  → Setting up user...");
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingUser) {
    await supabase.from("users").update({ org_id: orgId }).eq("id", userId);
    console.log(`    Updated existing user to demo org`);
  } else {
    await supabase.from("users").insert({
      id: userId,
      org_id: orgId,
      email: authUser.email!,
      first_name: authUser.email!.split("@")[0],
      last_name: null,
      role: "owner",
      status: "active",
      timezone: "America/Toronto",
    });
    console.log(`    Recreated public.users row for auth user`);
  }

  // 5. Agents
  console.log("  → Creating agents...");
  await supabase.from("agents").insert([
    {
      id: agentSarahId,
      org_id: orgId,
      name: "Sarah — Mortgage Specialist",
      direction: "outbound",
      agent_type: "Mortgage",
      status: "active",
      purpose_description: "Outbound calls to mortgage leads for refinancing, renewals, and new purchases.",
      preferred_greeting: "Hi, this is Sarah calling from Apex Mortgage Group.",
      voice_gender: "female",
      total_calls: 0,
      total_bookings: 0,
      booking_rate: 0,
    },
    {
      id: agentMikeId,
      org_id: orgId,
      name: "Mike — Insurance Follow-up",
      direction: "outbound",
      agent_type: "Insurance",
      status: "active",
      purpose_description: "Follow-up calls to existing mortgage clients for insurance cross-sell opportunities.",
      preferred_greeting: "Hi, this is Mike from Apex Mortgage Group. I'm calling about your home insurance.",
      voice_gender: "male",
      total_calls: 0,
      total_bookings: 0,
      booking_rate: 0,
    },
  ]);

  // 5. Campaigns
  console.log("  → Creating campaigns...");
  await supabase.from("campaigns").insert([
    {
      id: campaignQ1Id,
      org_id: orgId,
      name: "Q1 Mortgage Leads",
      agent_id: agentSarahId,
      status: "active",
      total_leads: 15,
      calls_made: 0,
      calls_connected: 0,
      bookings: 0,
      total_duration_minutes: 0,
      daily_call_limit: 50,
      max_retries: 3,
      retry_interval_hours: 24,
      timezone: "America/Toronto",
    },
    {
      id: campaignInsuranceId,
      org_id: orgId,
      name: "Insurance Cross-sell",
      agent_id: agentMikeId,
      status: "paused",
      total_leads: 10,
      calls_made: 0,
      calls_connected: 0,
      bookings: 0,
      total_duration_minutes: 0,
      daily_call_limit: 30,
      max_retries: 2,
      retry_interval_hours: 48,
      timezone: "America/Toronto",
    },
    {
      id: campaignSpringId,
      org_id: orgId,
      name: "Spring Refinance",
      agent_id: agentSarahId,
      status: "draft",
      total_leads: 5,
      calls_made: 0,
      calls_connected: 0,
      bookings: 0,
      total_duration_minutes: 0,
      daily_call_limit: 40,
      max_retries: 3,
      retry_interval_hours: 24,
      timezone: "America/Toronto",
    },
  ]);

  // 6. Contacts
  console.log("  → Creating 30 contacts...");
  const contactInserts = CONTACTS.map((c, i) => ({
    id: contactIds[i],
    org_id: orgId,
    first_name: c.first,
    last_name: c.last,
    phone: c.phone,
    email: c.email,
    company: c.company,
    source: pick(["csv_import", "manual", "website", "referral"]),
  }));
  const { error: contactErr } = await supabase.from("contacts").insert(contactInserts);
  if (contactErr) throw new Error(`Contact insert failed: ${contactErr.message}`);

  // 7. Leads — distribute across campaigns
  console.log("  → Creating 30 leads...");

  // Campaign 1 (Q1 Mortgage) — contacts 0-14, partially called
  // Campaign 2 (Insurance) — contacts 15-24, partially called
  // Campaign 3 (Spring Refinance) — contacts 25-29, no calls (draft)

  type LeadDef = {
    contactIdx: number;
    campaignId: string;
    status: string;
    lastOutcome: string | null;
    retryCount: number;
  };

  const leadDefs: LeadDef[] = [
    // Q1 Mortgage — 15 leads
    { contactIdx: 0, campaignId: campaignQ1Id, status: "appt_set", lastOutcome: "booked", retryCount: 1 },
    { contactIdx: 1, campaignId: campaignQ1Id, status: "interested", lastOutcome: "interested", retryCount: 1 },
    { contactIdx: 2, campaignId: campaignQ1Id, status: "appt_set", lastOutcome: "booked", retryCount: 2 },
    { contactIdx: 3, campaignId: campaignQ1Id, status: "contacted", lastOutcome: "callback", retryCount: 1 },
    { contactIdx: 4, campaignId: campaignQ1Id, status: "contacted", lastOutcome: "voicemail", retryCount: 2 },
    { contactIdx: 5, campaignId: campaignQ1Id, status: "interested", lastOutcome: "interested", retryCount: 1 },
    { contactIdx: 6, campaignId: campaignQ1Id, status: "contacted", lastOutcome: "no_answer", retryCount: 1 },
    { contactIdx: 7, campaignId: campaignQ1Id, status: "closed_lost", lastOutcome: "not_interested", retryCount: 1 },
    { contactIdx: 8, campaignId: campaignQ1Id, status: "contacted", lastOutcome: "voicemail", retryCount: 1 },
    { contactIdx: 9, campaignId: campaignQ1Id, status: "showed", lastOutcome: "booked", retryCount: 1 },
    { contactIdx: 10, campaignId: campaignQ1Id, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 11, campaignId: campaignQ1Id, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 12, campaignId: campaignQ1Id, status: "contacted", lastOutcome: "no_answer", retryCount: 2 },
    { contactIdx: 13, campaignId: campaignQ1Id, status: "closed_won", lastOutcome: "booked", retryCount: 1 },
    { contactIdx: 14, campaignId: campaignQ1Id, status: "bad_lead", lastOutcome: "wrong_number", retryCount: 1 },

    // Insurance Cross-sell — 10 leads
    { contactIdx: 15, campaignId: campaignInsuranceId, status: "appt_set", lastOutcome: "booked", retryCount: 1 },
    { contactIdx: 16, campaignId: campaignInsuranceId, status: "interested", lastOutcome: "interested", retryCount: 1 },
    { contactIdx: 17, campaignId: campaignInsuranceId, status: "contacted", lastOutcome: "callback", retryCount: 1 },
    { contactIdx: 18, campaignId: campaignInsuranceId, status: "contacted", lastOutcome: "voicemail", retryCount: 1 },
    { contactIdx: 19, campaignId: campaignInsuranceId, status: "contacted", lastOutcome: "no_answer", retryCount: 1 },
    { contactIdx: 20, campaignId: campaignInsuranceId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 21, campaignId: campaignInsuranceId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 22, campaignId: campaignInsuranceId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 23, campaignId: campaignInsuranceId, status: "contacted", lastOutcome: "not_interested", retryCount: 1 },
    { contactIdx: 24, campaignId: campaignInsuranceId, status: "contacted", lastOutcome: "voicemail", retryCount: 2 },

    // Spring Refinance — 5 leads (draft, no calls)
    { contactIdx: 25, campaignId: campaignSpringId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 26, campaignId: campaignSpringId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 27, campaignId: campaignSpringId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 28, campaignId: campaignSpringId, status: "new", lastOutcome: null, retryCount: 0 },
    { contactIdx: 29, campaignId: campaignSpringId, status: "new", lastOutcome: null, retryCount: 0 },
  ];

  const leadIds = leadDefs.map(() => randomUUID());

  const leadInserts = leadDefs.map((l, i) => ({
    id: leadIds[i],
    org_id: orgId,
    contact_id: contactIds[l.contactIdx],
    campaign_id: l.campaignId,
    status: l.status,
    last_call_outcome: l.lastOutcome,
    retry_count: l.retryCount,
    last_activity_at: l.retryCount > 0 ? daysAgo(Math.floor(Math.random() * 12) + 1) : null,
  }));
  const { error: leadErr } = await supabase.from("leads").insert(leadInserts);
  if (leadErr) throw new Error(`Lead insert failed: ${leadErr.message}`);

  // 8. Calls — one per lead that has been contacted (retryCount > 0)
  console.log("  → Creating calls...");

  type CallDef = {
    leadIdx: number;
    outcome: string;
    summaryKey: string;
    daysAgo: number;
    duration: number;
    sentiment: string;
    engagement: string;
    transcript?: string;
  };

  const callDefs: CallDef[] = [
    // Q1 Mortgage calls
    { leadIdx: 0, outcome: "booked", summaryKey: "booked", daysAgo: 3, duration: 312, sentiment: "positive", engagement: "high" },
    { leadIdx: 1, outcome: "interested", summaryKey: "interested", daysAgo: 5, duration: 198, sentiment: "positive", engagement: "medium" },
    { leadIdx: 2, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 10, duration: 32, sentiment: "neutral", engagement: "low" },
    { leadIdx: 2, outcome: "booked", summaryKey: "booked", daysAgo: 7, duration: 278, sentiment: "positive", engagement: "high" },
    { leadIdx: 3, outcome: "callback", summaryKey: "callback", daysAgo: 2, duration: 45, sentiment: "neutral", engagement: "medium" },
    { leadIdx: 4, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 6, duration: 30, sentiment: "neutral", engagement: "low" },
    { leadIdx: 4, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 4, duration: 35, sentiment: "neutral", engagement: "low" },
    { leadIdx: 5, outcome: "interested", summaryKey: "interested", daysAgo: 1, duration: 245, sentiment: "positive", engagement: "high" },
    { leadIdx: 6, outcome: "no_answer", summaryKey: "no_answer", daysAgo: 3, duration: 0, sentiment: "neutral", engagement: "none" },
    { leadIdx: 7, outcome: "not_interested", summaryKey: "not_interested", daysAgo: 8, duration: 87, sentiment: "negative", engagement: "low" },
    { leadIdx: 8, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 4, duration: 33, sentiment: "neutral", engagement: "low" },
    { leadIdx: 9, outcome: "booked", summaryKey: "booked", daysAgo: 6, duration: 290, sentiment: "positive", engagement: "high" },
    { leadIdx: 12, outcome: "no_answer", summaryKey: "no_answer", daysAgo: 9, duration: 0, sentiment: "neutral", engagement: "none" },
    { leadIdx: 12, outcome: "no_answer", summaryKey: "no_answer", daysAgo: 5, duration: 0, sentiment: "neutral", engagement: "none" },
    { leadIdx: 13, outcome: "booked", summaryKey: "booked", daysAgo: 11, duration: 340, sentiment: "positive", engagement: "high" },
    { leadIdx: 14, outcome: "wrong_number", summaryKey: "not_interested", daysAgo: 7, duration: 15, sentiment: "negative", engagement: "none" },

    // Insurance calls
    { leadIdx: 15, outcome: "booked", summaryKey: "booked", daysAgo: 4, duration: 220, sentiment: "positive", engagement: "high" },
    { leadIdx: 16, outcome: "interested", summaryKey: "interested", daysAgo: 3, duration: 175, sentiment: "positive", engagement: "medium" },
    { leadIdx: 17, outcome: "callback", summaryKey: "callback", daysAgo: 2, duration: 52, sentiment: "neutral", engagement: "medium" },
    { leadIdx: 18, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 5, duration: 30, sentiment: "neutral", engagement: "low" },
    { leadIdx: 19, outcome: "no_answer", summaryKey: "no_answer", daysAgo: 6, duration: 0, sentiment: "neutral", engagement: "none" },
    { leadIdx: 23, outcome: "not_interested", summaryKey: "not_interested", daysAgo: 3, duration: 65, sentiment: "negative", engagement: "low" },
    { leadIdx: 24, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 8, duration: 31, sentiment: "neutral", engagement: "low" },
    { leadIdx: 24, outcome: "voicemail", summaryKey: "voicemail", daysAgo: 4, duration: 34, sentiment: "neutral", engagement: "low" },
  ];

  // Transcripts for a couple of booked calls
  const sampleTranscript1 = `Agent: Hi, this is Sarah calling from Apex Mortgage Group. Am I speaking with James?
James: Yes, this is James.
Agent: Great! I'm calling because we noticed your mortgage renewal is coming up, and I wanted to see if you'd be interested in exploring some options that could save you money.
James: Actually, yeah. My rate is 5.2% right now and I've been thinking about looking around.
Agent: That's a great rate to improve on. With current rates, we might be able to get you into the low 4% range, especially if you're open to a variable rate. Would you like to book a consultation to go over the numbers?
James: Sure, that sounds good. What times do you have?
Agent: How about next Tuesday at 2 PM?
James: That works for me.
Agent: Perfect, I'll send you a confirmation. Thanks, James!`;

  const sampleTranscript2 = `Agent: Hi, this is Sarah from Apex Mortgage Group. Is this David?
David: Yeah, who's this?
Agent: I'm calling about mortgage options for homebuyers in the GTA. We have some competitive pre-approval rates right now.
David: Oh actually, I am looking. My wife and I want to buy in Mississauga.
Agent: That's great! What price range are you looking at?
David: Probably 600 to 800K range. We have about 15% saved for a down payment.
Agent: Excellent. With 15% down, you'd avoid CMHC insurance on properties under $720K. I'd love to sit down and walk you through your options. Would you like to book a meeting?
David: Yes, let's do it. How about Thursday afternoon?
Agent: Thursday at 3 PM works. I'll send you a confirmation email. Thanks, David!`;

  const callIds = callDefs.map(() => randomUUID());

  const callInserts = callDefs.map((c, i) => {
    const summaries = SUMMARIES[c.summaryKey as keyof typeof SUMMARIES];
    const summary = pick(summaries);
    const agentId = leadDefs[c.leadIdx].campaignId === campaignQ1Id ? agentSarahId : agentMikeId;
    const campaignId = leadDefs[c.leadIdx].campaignId;
    const startedAt = daysAgo(c.daysAgo, 9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
    const endedAt = c.duration > 0
      ? new Date(new Date(startedAt).getTime() + c.duration * 1000).toISOString()
      : startedAt;

    let transcript: string | null = null;
    if (i === 0) transcript = sampleTranscript1;
    if (i === 3) transcript = sampleTranscript2;

    return {
      id: callIds[i],
      org_id: orgId,
      lead_id: leadIds[c.leadIdx],
      contact_id: contactIds[leadDefs[c.leadIdx].contactIdx],
      agent_id: agentId,
      campaign_id: campaignId,
      direction: "outbound" as const,
      outcome: c.outcome,
      duration_seconds: c.duration,
      started_at: startedAt,
      ended_at: endedAt,
      ai_summary: summary.full,
      summary_one_line: summary.one,
      sentiment: c.sentiment,
      engagement_level: c.engagement,
      outcome_confidence: c.outcome === "no_answer" ? null : 0.7 + Math.random() * 0.25,
      transcript_text: transcript,
    };
  });
  const { error: callErr } = await supabase.from("calls").insert(callInserts);
  if (callErr) throw new Error(`Call insert failed: ${callErr.message}`);

  // 9. Appointments
  console.log("  → Creating 5 appointments...");
  const appointmentInserts = [
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[0],
      lead_id: leadIds[0],
      campaign_id: campaignQ1Id,
      call_id: callIds[0],
      scheduled_at: today(10, 30),
      duration_minutes: 30,
      status: "scheduled",
      notes: "Refinancing discussion — currently at 5.2% with RBC",
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[9],
      lead_id: leadIds[9],
      campaign_id: campaignQ1Id,
      call_id: callIds[11],
      scheduled_at: today(14, 0),
      duration_minutes: 45,
      status: "scheduled",
      notes: "Pre-approval meeting — first-time buyer",
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[2],
      lead_id: leadIds[2],
      campaign_id: campaignQ1Id,
      call_id: callIds[3],
      scheduled_at: tomorrow(11, 0),
      duration_minutes: 30,
      status: "scheduled",
      notes: "Rate comparison for renewal — TD mortgage at 4.8%",
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[15],
      lead_id: leadIds[15],
      campaign_id: campaignInsuranceId,
      call_id: callIds[16],
      scheduled_at: nextWeek(5, 10, 0),
      duration_minutes: 30,
      status: "scheduled",
      notes: "Home insurance cross-sell — existing mortgage client",
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[13],
      lead_id: leadIds[13],
      campaign_id: campaignQ1Id,
      call_id: callIds[14],
      scheduled_at: daysAgo(5, 14, 0),
      duration_minutes: 45,
      status: "showed",
      notes: "Signed fixed 4-year at 4.49% — closed won",
    },
  ];
  const { error: apptErr } = await supabase.from("appointments").insert(appointmentInserts);
  if (apptErr) throw new Error(`Appointment insert failed: ${apptErr.message}`);

  // 10. Action items
  console.log("  → Creating 6 action items...");
  const actionInserts = [
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[3],
      lead_id: leadIds[3],
      call_id: callIds[4],
      title: "Callback requested",
      description: "Maria Santos asked to be called back after 6 PM today",
      type: "callback_request" as const,
      campaign_name: "Q1 Mortgage Leads",
      is_resolved: false,
      created_at: daysAgo(0, 9, 30),
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[5],
      lead_id: leadIds[5],
      title: "Hot lead — high engagement",
      description: "Sarah Thompson showed strong interest in variable rate options. Engagement level: high. Follow up immediately.",
      type: "hot_lead" as const,
      campaign_name: "Q1 Mortgage Leads",
      is_resolved: false,
      created_at: daysAgo(1, 14, 15),
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[17],
      lead_id: leadIds[17],
      call_id: callIds[18],
      title: "Callback requested",
      description: "Chris Martinez asked to be called back tomorrow morning 9-11 AM",
      type: "callback_request" as const,
      campaign_name: "Insurance Cross-sell",
      is_resolved: false,
      created_at: daysAgo(1, 10, 0),
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[1],
      lead_id: leadIds[1],
      title: "Manual booking needed",
      description: "Priya Sharma wants to book but prefers in-person meeting at our downtown office. Needs manual scheduling.",
      type: "manual_booking_needed" as const,
      campaign_name: "Q1 Mortgage Leads",
      is_resolved: false,
      created_at: daysAgo(0, 11, 45),
    },
    // Resolved items
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[0],
      lead_id: leadIds[0],
      call_id: callIds[0],
      title: "Hot lead — booked appointment",
      description: "James Chen booked refinancing consultation",
      type: "hot_lead" as const,
      campaign_name: "Q1 Mortgage Leads",
      is_resolved: true,
      resolved_at: daysAgo(2),
      resolution_type: "appointment_scheduled" as const,
      created_at: daysAgo(3, 15, 0),
    },
    {
      id: randomUUID(),
      org_id: orgId,
      contact_id: contactIds[16],
      lead_id: leadIds[16],
      title: "SMS reply received",
      description: "Jennifer Lee replied 'Yes interested, please send details'",
      type: "sms_reply" as const,
      campaign_name: "Insurance Cross-sell",
      is_resolved: true,
      resolved_at: daysAgo(1),
      resolution_type: "followup_scheduled" as const,
      created_at: daysAgo(2, 16, 30),
    },
  ];
  const { error: actionErr } = await supabase.from("action_items").insert(actionInserts);
  if (actionErr) throw new Error(`Action item insert failed: ${actionErr.message}`);

  // 11. Notifications
  console.log("  → Creating 4 notifications...");
  const notifInserts = [
    {
      org_id: orgId,
      user_id: userId,
      type: "appointment_booked",
      title: "New appointment booked",
      body: "James Chen booked a refinancing consultation for today at 10:30 AM",
      is_read: false,
      reference_type: "appointment",
      created_at: daysAgo(0, 9, 0),
    },
    {
      org_id: orgId,
      user_id: userId,
      type: "hot_lead_alert",
      title: "Hot lead detected",
      body: "Sarah Thompson showed high engagement discussing variable rate options",
      is_read: false,
      reference_type: "lead",
      created_at: daysAgo(1, 14, 20),
    },
    {
      org_id: orgId,
      user_id: userId,
      type: "sms_reply_received",
      title: "SMS reply from Jennifer Lee",
      body: "'Yes interested, please send details' — Insurance Cross-sell campaign",
      is_read: true,
      read_at: daysAgo(1, 17, 0),
      reference_type: "lead",
      created_at: daysAgo(2, 16, 30),
    },
    {
      org_id: orgId,
      user_id: userId,
      type: "campaign_completed",
      title: "Campaign milestone",
      body: "Q1 Mortgage Leads has reached 80% call completion",
      is_read: true,
      read_at: daysAgo(1, 8, 0),
      reference_type: "campaign",
      created_at: daysAgo(2, 8, 0),
    },
  ];
  const { error: notifErr } = await supabase.from("notifications").insert(notifInserts);
  if (notifErr) throw new Error(`Notification insert failed: ${notifErr.message}`);

  // 12. Update denormalized counts
  console.log("  → Updating denormalized counts...");
  await updateDenormalizedCounts();

  console.log("\n✅ Seed complete! Demo data for 'Apex Mortgage Group' is ready.\n");
}

async function cleanUp() {
  console.log("  → Checking for existing demo org...");
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", DEMO_ORG_NAME);

  if (!existing || existing.length === 0) {
    console.log("    No existing demo org found — fresh seed.");
    return;
  }

  const existingOrgId = existing[0].id;
  console.log(`    Found existing demo org ${existingOrgId} — cleaning up...`);

  // Delete in reverse FK order
  await supabase.from("notifications").delete().eq("org_id", existingOrgId);
  await supabase.from("action_items").delete().eq("org_id", existingOrgId);
  await supabase.from("appointments").delete().eq("org_id", existingOrgId);
  await supabase.from("calls").delete().eq("org_id", existingOrgId);
  await supabase.from("leads").delete().eq("org_id", existingOrgId);
  await supabase.from("contacts").delete().eq("org_id", existingOrgId);
  await supabase.from("campaign_schedules").delete().match({ campaign_id: existingOrgId }); // may not exist
  // Delete campaign_schedules for campaigns in this org
  const { data: campaignsToDelete } = await supabase
    .from("campaigns")
    .select("id")
    .eq("org_id", existingOrgId);
  if (campaignsToDelete) {
    for (const c of campaignsToDelete) {
      await supabase.from("campaign_schedules").delete().eq("campaign_id", c.id);
    }
  }
  await supabase.from("campaigns").delete().eq("org_id", existingOrgId);
  await supabase.from("agents").delete().eq("org_id", existingOrgId);
  await supabase.from("subscriptions").delete().eq("org_id", existingOrgId);
  await supabase.from("invoices").delete().eq("org_id", existingOrgId);
  await supabase.from("compliance_settings").delete().eq("org_id", existingOrgId);
  await supabase.from("verification").delete().eq("org_id", existingOrgId);
  await supabase.from("integrations").delete().eq("org_id", existingOrgId);
  await supabase.from("sms_messages").delete().eq("org_id", existingOrgId);
  await supabase.from("emails").delete().eq("org_id", existingOrgId);
  await supabase.from("phone_numbers").delete().eq("org_id", existingOrgId);
  await supabase.from("dnc_list").delete().eq("org_id", existingOrgId);
  await supabase.from("workflow_events").delete().eq("org_id", existingOrgId);

  // Don't delete users (keep existing auth user), just reassign org later
  // Delete the org itself
  await supabase.from("organizations").delete().eq("id", existingOrgId);

  console.log("    Cleanup done.");
}

async function updateDenormalizedCounts() {
  // Count calls per campaign
  for (const [campaignId, agentId] of [
    [campaignQ1Id, agentSarahId],
    [campaignInsuranceId, agentMikeId],
  ] as const) {
    const { count: callsMade } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const { count: connected } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .not("outcome", "in", "(no_answer,voicemail)");

    const { count: bookings } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const { data: durations } = await supabase
      .from("calls")
      .select("duration_seconds")
      .eq("campaign_id", campaignId);

    const totalMinutes = Math.round(
      (durations ?? []).reduce((s: number, r: { duration_seconds: number | null }) => s + (r.duration_seconds ?? 0), 0) / 60
    );

    await supabase
      .from("campaigns")
      .update({
        calls_made: callsMade ?? 0,
        calls_connected: connected ?? 0,
        bookings: bookings ?? 0,
        total_duration_minutes: totalMinutes,
      })
      .eq("id", campaignId);

    // Agent stats
    const { count: agentCalls } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);

    const { count: agentBookings } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const rate = agentCalls && agentCalls > 0 ? Math.round(((agentBookings ?? 0) / agentCalls) * 100) : 0;

    await supabase
      .from("agents")
      .update({
        total_calls: agentCalls ?? 0,
        total_bookings: agentBookings ?? 0,
        booking_rate: rate,
      })
      .eq("id", agentId);
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
