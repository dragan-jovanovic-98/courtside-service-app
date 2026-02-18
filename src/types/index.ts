/**
 * Derived types for Courtside AI
 *
 * Re-exports base types from database.types.ts and defines
 * composite types used across the application.
 */

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database.types";

import type { Tables } from "./database.types";

// ── Base row types (convenience aliases) ────────────────────────────

export type Organization = Tables<"organizations">;
export type User = Tables<"users">;
export type Contact = Tables<"contacts">;
export type Lead = Tables<"leads">;
export type Campaign = Tables<"campaigns">;
export type Agent = Tables<"agents">;
export type Call = Tables<"calls">;
export type Appointment = Tables<"appointments">;
export type ActionItem = Tables<"action_items">;
export type CampaignSchedule = Tables<"campaign_schedules">;
export type PhoneNumber = Tables<"phone_numbers">;
export type DncEntry = Tables<"dnc_list">;
export type Subscription = Tables<"subscriptions">;
export type Invoice = Tables<"invoices">;
export type Verification = Tables<"verification">;
export type ComplianceSettings = Tables<"compliance_settings">;
export type NotificationPreference = Tables<"notification_preferences">;
export type Integration = Tables<"integrations">;
export type SmsMessage = Tables<"sms_messages">;
export type Email = Tables<"emails">;
export type Notification = Tables<"notifications">;
export type WorkflowEvent = Tables<"workflow_events">;

// ── Composite / joined types ────────────────────────────────────────

/** Lead with its parent contact info — used in leads table, lead detail */
export type LeadWithContact = Lead & {
  contacts: Contact;
};

/** Call with agent and contact info — used in calls table, call detail */
export type CallWithAgent = Call & {
  agents: Agent | null;
  contacts: Contact | null;
};

/** Call with full related data — used in call detail view */
export type CallWithDetails = Call & {
  agents: Agent | null;
  contacts: Contact | null;
  leads: Lead | null;
  campaigns: Pick<Campaign, "id" | "name"> | null;
};

/** Appointment with contact and campaign info — used in calendar */
export type AppointmentWithDetails = Appointment & {
  contacts: Contact;
  campaigns: Pick<Campaign, "id" | "name" | "status"> | null;
  leads: Pick<Lead, "id" | "status"> | null;
};

/** Action item with contact info — used in dashboard action zone */
export type ActionItemWithContact = ActionItem & {
  contacts: Contact;
};

/** Campaign with its agent info — used in campaign cards/list */
export type CampaignWithAgent = Campaign & {
  agents: Pick<Agent, "id" | "name" | "status" | "direction"> | null;
};

/** Lead with contact and latest call info — used in lead detail */
export type LeadWithDetails = Lead & {
  contacts: Contact;
  campaigns: Pick<Campaign, "id" | "name" | "status">;
  calls: Call[];
  appointments: Appointment[];
};

/** User with org info — used after auth */
export type UserWithOrg = User & {
  organizations: Organization;
};
