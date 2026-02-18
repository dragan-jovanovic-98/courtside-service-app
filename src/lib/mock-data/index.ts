/**
 * Mock data for Courtside AI — used during Phase 4 frontend development.
 * Will be replaced with real Supabase queries in Phase 8.
 */

// ── Appointments ────────────────────────────────────────────────────

export const mockAppointments = [
  { id: "1", time: "9:00 AM", name: "Sarah Mitchell", company: "First National Lending", context: "Spring Mortgage — strong interest in refinancing", campaign: "Spring Mortgage", phone: "(555) 234-8901", duration: "4:32", summary: "Strong refinancing interest. Current rate 6.2%. Booked consultation for rate review." },
  { id: "2", time: "10:30 AM", name: "David Park", company: "Park Financial Group", context: "Insurance Outreach — whole life policy options", campaign: "Insurance", phone: "(555) 890-1234", duration: "3:18", summary: "Whole life policy discussion. Has existing term life, wants to explore conversion." },
  { id: "3", time: "1:00 PM", name: "Jennifer Torres", company: "Torres & Associates", context: "Follow-up — commercial lending terms", campaign: "Commercial", phone: "(555) 901-2345", duration: "5:12", summary: "Follow-up on commercial lending terms. Ready to move forward with application." },
  { id: "4", time: "3:30 PM", name: "Michael Brown", company: "Independent Broker", context: "Referral — investment property financing", campaign: "Spring Mortgage", phone: "(555) 777-8888", duration: "2:45", summary: "Referral from existing client. Investment property financing." },
];

// ── Action Items ────────────────────────────────────────────────────

export type ActionItemType = "sms" | "cb" | "int" | "em";

export const mockActionItems = [
  { id: "1", name: "Robert Chen", reason: 'Replied to SMS: "Yes, I\'m interested. Call me tomorrow?"', campaign: "Spring Mortgage", time: "12m ago", type: "sms" as ActionItemType },
  { id: "2", name: "Lisa Nguyen", reason: "Requested callback at 2:00 PM today", campaign: "Insurance Outreach", time: "45m ago", type: "cb" as ActionItemType },
  { id: "3", name: "Marcus Johnson", reason: "Strong interest — no slot available, needs manual booking", campaign: "Spring Mortgage", time: "1h ago", type: "int" as ActionItemType },
  { id: "4", name: "Amanda Foster", reason: "Opened email 3x, clicked booking link, didn't complete", campaign: "Q1 Refi Push", time: "2h ago", type: "em" as ActionItemType },
  { id: "5", name: "Kevin Wright", reason: "Left voicemail — call back this week", campaign: "Commercial Lending", time: "3h ago", type: "cb" as ActionItemType },
];

// ── Campaigns ───────────────────────────────────────────────────────

export const mockCampaigns = [
  { id: "1", name: "Spring Mortgage Campaign", status: "active" as const, agent: "Sarah — Mortgage", totalLeads: 340, callsMade: 187, connected: 89, booked: 12, minutes: 47, remaining: 153, estCompletion: "2 days", connectRate: "47%" },
  { id: "2", name: "Insurance Outreach Q1", status: "active" as const, agent: "James — Insurance", totalLeads: 220, callsMade: 95, connected: 52, booked: 7, minutes: 23, remaining: 125, estCompletion: "3 days", connectRate: "55%" },
  { id: "3", name: "Commercial Lending Push", status: "paused" as const, agent: "Sarah — Mortgage", totalLeads: 150, callsMade: 43, connected: 21, booked: 3, minutes: 11, remaining: 107, estCompletion: "—", connectRate: "49%" },
  { id: "4", name: "Q1 Refinance Follow-Up", status: "completed" as const, agent: "Sarah — Mortgage", totalLeads: 180, callsMade: 180, connected: 94, booked: 18, minutes: 89, remaining: 0, estCompletion: "Done", connectRate: "52%" },
  { id: "5", name: "Home Equity Lines", status: "draft" as const, agent: "Unassigned", totalLeads: 0, callsMade: 0, connected: 0, booked: 0, minutes: 0, remaining: 0, estCompletion: "—", connectRate: "—" },
];

// ── Leads ───────────────────────────────────────────────────────────

export const mockLeads = [
  { id: "1", name: "Sarah Mitchell", phone: "(555) 234-8901", email: "sarah@firstnat.com", company: "First National", status: "Appt Set", outcome: "Booked", lastActivity: "Today", campaign: "Spring Mortgage" },
  { id: "2", name: "Robert Chen", phone: "(555) 345-6789", email: "rchen@gmail.com", company: "Chen Investments", status: "Interested", outcome: "Interested", lastActivity: "Today", campaign: "Spring Mortgage" },
  { id: "3", name: "Lisa Nguyen", phone: "(555) 456-7890", email: "lisa@outlook.com", company: "Nguyen Financial", status: "Contacted", outcome: "Callback", lastActivity: "Today", campaign: "Insurance" },
  { id: "4", name: "Marcus Johnson", phone: "(555) 567-8901", email: "mj@corp.com", company: "Johnson Props", status: "Interested", outcome: "Interested", lastActivity: "Yesterday", campaign: "Spring Mortgage" },
  { id: "5", name: "Amanda Foster", phone: "(555) 678-9012", email: "af@email.com", company: "Foster Holdings", status: "Contacted", outcome: "Voicemail", lastActivity: "Yesterday", campaign: "Q1 Refi" },
  { id: "6", name: "Kevin Wright", phone: "(555) 789-0123", email: "kw@biz.com", company: "Wright & Sons", status: "Contacted", outcome: "Voicemail", lastActivity: "Yesterday", campaign: "Commercial" },
  { id: "7", name: "David Park", phone: "(555) 890-1234", email: "dp@parkfin.com", company: "Park Financial", status: "Appt Set", outcome: "Booked", lastActivity: "2 days ago", campaign: "Insurance" },
  { id: "8", name: "Jennifer Torres", phone: "(555) 901-2345", email: "jt@torres.com", company: "Torres & Assoc", status: "Appt Set", outcome: "Booked", lastActivity: "2 days ago", campaign: "Commercial" },
  { id: "9", name: "Tom Rivera", phone: "(555) 111-2222", email: "tr@bad.com", company: "Rivera LLC", status: "Bad Lead", outcome: "Wrong Number", lastActivity: "3 days ago", campaign: "Spring Mortgage" },
  { id: "10", name: "Nancy Bell", phone: "(555) 333-4444", email: "nb@dnc.com", company: "Bell Corp", status: "Bad Lead", outcome: "DNC", lastActivity: "3 days ago", campaign: "Insurance" },
];

// ── Calls ───────────────────────────────────────────────────────────

export const mockCalls = [
  { id: "1", date: "Today 8:12 AM", name: "Sarah Mitchell", phone: "(555) 234-8901", agent: "Sarah", duration: "4:32", outcome: "Booked", campaign: "Spring Mortgage", direction: "out" as const },
  { id: "2", date: "Today 8:06 AM", name: "Robert Chen", phone: "(555) 345-6789", agent: "Sarah", duration: "2:15", outcome: "Interested", campaign: "Spring Mortgage", direction: "out" as const },
  { id: "3", date: "Today 7:58 AM", name: "Daniel Kim", phone: "(555) 222-3333", agent: "Sarah", duration: "1:03", outcome: "No Answer", campaign: "Spring Mortgage", direction: "out" as const },
  { id: "4", date: "Today 7:45 AM", name: "Lisa Nguyen", phone: "(555) 456-7890", agent: "James", duration: "3:47", outcome: "Callback", campaign: "Insurance", direction: "out" as const },
  { id: "5", date: "Today 7:30 AM", name: "Karen White", phone: "(555) 888-9999", agent: "James", duration: "0:45", outcome: "Not Interested", campaign: "Insurance", direction: "out" as const },
  { id: "6", date: "Yest 6:42 PM", name: "Marcus Johnson", phone: "(555) 567-8901", agent: "Sarah", duration: "5:12", outcome: "Interested", campaign: "Spring Mortgage", direction: "out" as const },
  { id: "7", date: "Yest 6:31 PM", name: "Amanda Foster", phone: "(555) 678-9012", agent: "Sarah", duration: "2:58", outcome: "Voicemail", campaign: "Q1 Refi", direction: "out" as const },
  { id: "8", date: "Yest 6:18 PM", name: "Kevin Wright", phone: "(555) 789-0123", agent: "Sarah", duration: "1:22", outcome: "Voicemail", campaign: "Commercial", direction: "out" as const },
  { id: "9", date: "Yest 6:05 PM", name: "Tom Rivera", phone: "(555) 111-2222", agent: "Sarah", duration: "0:18", outcome: "Wrong Number", campaign: "Spring Mortgage", direction: "out" as const },
  { id: "10", date: "Yest 5:50 PM", name: "Nancy Bell", phone: "(555) 333-4444", agent: "James", duration: "0:32", outcome: "DNC", campaign: "Insurance", direction: "out" as const },
  { id: "11", date: "Today 9:15 AM", name: "Patricia Gomez", phone: "(555) 444-5555", agent: "Sarah", duration: "3:21", outcome: "Booked", campaign: "Spring Mortgage", direction: "in" as const },
  { id: "12", date: "Today 10:02 AM", name: "Unknown", phone: "(555) 999-0000", agent: "James", duration: "0:42", outcome: "No Answer", campaign: "—", direction: "in" as const },
];

// ── Agents (for campaign wizard) ────────────────────────────────────

export const mockAgents = [
  { id: "1", name: "Sarah — Mortgage Specialist", tag: "Mortgage", description: "Warm, professional. Refinancing & home purchase." },
  { id: "2", name: "James — Insurance Advisor", tag: "Insurance", description: "Consultative. Whole life & term life." },
  { id: "3", name: "Alex — General Financial", tag: "Multi", description: "Versatile. General financial services." },
];

// ── Calendar appointments by day ────────────────────────────────────

export type CalendarAppointment = {
  time: string;
  name: string;
  company: string;
  phone: string;
  campaign: string;
  outcome: string;
  duration: string;
  summary: string;
};

export const mockCalendarData: Record<number, CalendarAppointment[]> = {
  12: [
    { time: "2:00 PM", name: "Patricia Gomez", company: "Gomez Properties", phone: "(555) 444-5555", campaign: "Spring Mortgage", outcome: "Booked", duration: "3:21", summary: "Interested in refinancing investment property. Currently at 6.8%. Booked consultation." },
    { time: "4:00 PM", name: "James Harris", company: "Harris Financial", phone: "(555) 555-6666", campaign: "Insurance", outcome: "Booked", duration: "4:12", summary: "Wants to review whole life policy options for family coverage." },
  ],
  14: [
    { time: "10:00 AM", name: "Thomas Reed", company: "Reed Investments", phone: "(555) 666-7777", campaign: "Commercial", outcome: "Booked", duration: "2:55", summary: "Commercial lending for new office space. Looking for competitive rates." },
  ],
  17: [
    { time: "9:00 AM", name: "Sarah Mitchell", company: "First National", phone: "(555) 234-8901", campaign: "Spring Mortgage", outcome: "Booked", duration: "4:32", summary: "Strong refinancing interest. Current rate 6.2%. Booked consultation for rate review." },
    { time: "10:30 AM", name: "David Park", company: "Park Financial", phone: "(555) 890-1234", campaign: "Insurance", outcome: "Booked", duration: "3:18", summary: "Whole life policy discussion. Has existing term life, wants to explore conversion." },
    { time: "1:00 PM", name: "Jennifer Torres", company: "Torres & Assoc", phone: "(555) 901-2345", campaign: "Commercial", outcome: "Booked", duration: "5:12", summary: "Follow-up on commercial lending terms. Ready to move forward with application." },
    { time: "3:30 PM", name: "Michael Brown", company: "Independent", phone: "(555) 777-8888", campaign: "Spring Mortgage", outcome: "Booked", duration: "2:45", summary: "Referral from existing client. Investment property financing." },
  ],
  18: [
    { time: "11:00 AM", name: "Robert Chen", company: "Chen Investments", phone: "(555) 345-6789", campaign: "Spring Mortgage", outcome: "Booked", duration: "2:15", summary: "Refinancing discussion scheduled. Very engaged lead." },
    { time: "2:00 PM", name: "Lisa Nguyen", company: "Nguyen Financial", phone: "(555) 456-7890", campaign: "Insurance", outcome: "Booked", duration: "3:47", summary: "Callback requested. Interested in term life options for business partners." },
  ],
  19: [
    { time: "10:00 AM", name: "Marcus Johnson", company: "Johnson Props", phone: "(555) 567-8901", campaign: "Spring Mortgage", outcome: "Booked", duration: "5:12", summary: "High interest in refinancing. Multiple properties." },
  ],
  20: [
    { time: "9:30 AM", name: "Amanda Foster", company: "Foster Holdings", phone: "(555) 678-9012", campaign: "Q1 Refi", outcome: "Booked", duration: "2:58", summary: "Follow-up appointment. Previously left voicemail, called back interested." },
    { time: "3:00 PM", name: "Kevin Wright", company: "Wright & Sons", phone: "(555) 789-0123", campaign: "Commercial", outcome: "Booked", duration: "1:22", summary: "Commercial lending inquiry. Small business expansion." },
  ],
};

// ── Settings: User / Profile ──────────────────────────────────────────

export const mockUser = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex@courtsidefinance.com",
  phone: "(555) 123-4567",
  timezone: "EST (Eastern Standard Time)",
  role: "Owner",
  initials: "AJ",
};

export const mockNotificationPrefs: [string, [number, number, number]][] = [
  ["Appointment Booked", [1, 1, 1]],
  ["Hot Lead Alert", [1, 1, 0]],
  ["SMS Reply Received", [1, 0, 0]],
  ["Campaign Completed", [1, 0, 1]],
  ["Daily Summary Digest", [0, 0, 1]],
  ["Agent Status Change", [1, 0, 1]],
  ["Verification Update", [1, 0, 1]],
];

// ── Settings: Billing ─────────────────────────────────────────────────

export const mockSubscription = {
  plan: "Professional",
  price: "$299/mo",
  renewalDate: "Mar 17, 2026",
  minutesUsed: 2847,
  minutesTotal: 5000,
  phoneNumbersUsed: 3,
  phoneNumbersTotal: 5,
};

export const mockInvoices = [
  { date: "Feb 2026", amount: "$299.00", status: "Paid" },
  { date: "Jan 2026", amount: "$299.00", status: "Paid" },
  { date: "Dec 2025", amount: "$248.40", status: "Paid" },
];

export const mockPhoneNumbers = [
  { number: "(555) 200-1000", type: "Texting" as const, assignedTo: "Spring Mortgage", texts: 342, calls: "—", status: "Active" },
  { number: "(555) 200-1001", type: "Texting" as const, assignedTo: "Insurance Outreach", texts: 187, calls: "—", status: "Active" },
  { number: "(555) 200-1002", type: "Inbound" as const, assignedTo: "James — Insurance", texts: "—", calls: 94, status: "Active" },
];

// ── Settings: Organization ────────────────────────────────────────────

export const mockOrganization = {
  name: "Courtside Finance",
  industry: "Mortgage Brokerage",
  businessType: "LLC",
  phone: "(555) 100-2000",
  website: "https://courtsidefinance.com",
  address: "123 Finance St, Suite 400, Toronto, ON M5V 2T6",
};

// ── Settings: Team ────────────────────────────────────────────────────

export const mockTeamMembers = [
  { name: "Alex Johnson", email: "alex@courtsidefinance.com", role: "Owner" as const, status: "Active" as const },
  { name: "Maria Garcia", email: "maria@courtsidefinance.com", role: "Admin" as const, status: "Active" as const },
  { name: "James Wilson", email: "james@courtsidefinance.com", role: "Member" as const, status: "Active" as const },
  { name: "Sarah Kim", email: "sarah@courtsidefinance.com", role: "Member" as const, status: "Invited" as const },
];

// ── Settings: Agents ──────────────────────────────────────────────────

export const mockSettingsAgents = [
  { name: "Sarah — Mortgage Specialist", type: "Mortgage", direction: "outbound" as const, status: "active" as const, calls: 523, booked: 42, rate: "8.0%", campaigns: 3, voice: "Female" },
  { name: "James — Insurance Advisor", type: "Insurance", direction: "inbound" as const, status: "active" as const, calls: 217, booked: 15, rate: "6.9%", campaigns: 2, phone: "(555) 200-1002", voice: "Male" },
  { name: "Alex — General Financial", type: "General", direction: "outbound" as const, status: "pending" as const, calls: 0, booked: 0, rate: "—", campaigns: 0, voice: "Male" },
];

// ── Settings: Integrations ────────────────────────────────────────────

export const mockIntegrations = [
  { name: "Google Calendar", description: "Sync AI-booked appointments to your calendar", status: "available" as const },
  { name: "Outlook Calendar", description: "Sync appointments to Microsoft Outlook", status: "soon" as const },
  { name: "HubSpot CRM", description: "Import and sync contacts, push call outcomes", status: "soon" as const },
  { name: "Salesforce", description: "Bi-directional contact sync, log activities", status: "soon" as const },
  { name: "GoHighLevel", description: "Sync leads, triggers, and appointments", status: "soon" as const },
  { name: "Zapier", description: "Connect to 5,000+ apps via Zapier workflows", status: "soon" as const },
];

// ── Settings: Compliance ──────────────────────────────────────────────

export const mockComplianceStats = {
  dncCount: 47,
  dncLastUpdated: "Feb 15",
  dncAutoAdded: 3,
  tosAcceptedDate: "Jan 3, 2026",
  lastReviewed: "Feb 15, 2026",
};

// ── Helpers ──────────────────────────────────────────────────────────

export const OUTCOMES = ["Booked", "Interested", "Callback", "Voicemail", "No Answer", "Not Interested", "Wrong Number", "DNC"] as const;
export const STATUSES = ["New", "Contacted", "Interested", "Appt Set", "Showed", "Closed Won", "Closed Lost", "Bad Lead"] as const;

export const campaignColor = (campaign: string): string => {
  const map: Record<string, string> = {
    "Spring Mortgage": "#34d399",
    "Insurance": "#60a5fa",
    "Commercial": "#fbbf24",
    "Q1 Refi": "#a78bfa",
  };
  return map[campaign] ?? "rgba(255,255,255,0.5)";
};
