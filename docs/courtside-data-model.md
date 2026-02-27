# Courtside AI — Data Model & Backend Architecture

> This document maps every screen, feature, and function from the Courtside AI prototype to the database tables, fields, relationships, enums, and backend services needed to build the platform. It is the single source of truth for planning the Supabase schema and backend architecture.

---

## Table of Contents

1. [Architecture Decisions](#architecture-decisions)
2. [Entity Relationship Overview](#entity-relationship-overview)
3. [Enums & Constants](#enums--constants)
4. [Database Tables](#database-tables)
5. [Screen-to-Table Mapping](#screen-to-table-mapping)
6. [Backend Functions & APIs](#backend-functions--apis)
7. [Post-Call Analysis — Structured Data Schema](#post-call-analysis--structured-data-schema)
8. [Post-Call Automation Flows](#post-call-automation-flows)
9. [Calendar Integration Architecture](#calendar-integration-architecture)
10. [Notification Delivery System](#notification-delivery-system)
11. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
12. [External Service Sync](#external-service-sync)
13. [N8N Workflow Events](#n8n-workflow-events)

---

## 1. Architecture Decisions

These decisions were locked in during the planning phase:

| Decision | Choice | Rationale |
|---|---|---|
| Contact model | **Contacts + Leads** split | Contact = the person. Lead = that person's journey in a specific campaign. One contact can have multiple leads across campaigns. |
| Multi-tenancy | **Always org-based** | Every user belongs to an organization, even solo brokers. RLS filters on `org_id`. |
| Billing data | **Store in DB + sync from Stripe** | Mirror plan, usage, invoices in Supabase for fast dashboard reads. Stripe webhooks keep it current. |
| Action items | **Dedicated `action_items` table** | Not derived from queries. Explicit records with resolution tracking. |
| Recordings | **Retell hosts audio, DB stores URLs** | No Supabase Storage needed. Store `recording_url` and `transcript_url` fields on calls. |
| Agent provisioning | **Hybrid** | Store agent config in DB. Build manually in Retell for now. API sync later. |
| N8N tracking | **DB tracks key events** | `workflow_events` table for auditability of webhook processing. |
| SMS | **Twilio for SMS, N8N orchestrates** | Dashboard handles simple standardized actions (confirmation, follow-up). |
| Calls ↔ Leads | **Calls can exist without leads** | Especially inbound calls. But always try to link via phone number matching. |
| Appointments | **Tied to lead records** | Demonstrates campaign effectiveness. Each appointment belongs to a lead. |

### Architecture Revisions (Feb 2026)

These updates refine the original decisions based on implementation experience:

| Decision | Revision | Rationale |
|---|---|---|
| Notification delivery | **DB trigger on `notifications` table → `deliver-notification` Edge Function** | All workflows just INSERT into `notifications`. Delivery logic (SendGrid email, Twilio SMS to broker) is centralized. No duplication. In-app is automatic (row exists). |
| N8N scope | **N8N only for scheduled jobs + complex branching** | Simple webhook→DB flows (Twilio SMS, Stripe) are Next.js API routes. N8N reserved for: Campaign Processor (cron), Retell Post-Call (8 outcome branches + AI node), Appointment Reminders (cron). |
| Post-call AI analysis | **Done in N8N via AI node, not Retell built-in** | Retell sends raw transcript + metadata. N8N AI node extracts structured analysis (outcome, financials, appointment details, etc.). More control over prompt and output schema. |
| Calendar sync | **Decoupled via DB trigger** | Post-call workflow inserts appointment. DB trigger on `appointments` fires `sync-appointment-to-calendar` Edge Function. Workflows never call calendar sync directly. |
| Calendar ownership | **Per-organization** | One calendar connection per org (not per-user). Simplifies management for V1. |
| Email service | **SendGrid** | Used for lead confirmations, broker notifications, appointment reminders. Credential: `KC Sendgrid`, sender domain: `court-side.ai`. |
| Notification channels | **In-app + Email + SMS (no push)** | No mobile app, so no push notifications. Broker opts in per event type via `notification_preferences`. |
| Post-call scope (V1) | **Outbound campaigns only** | 7.1 Retell Post-Call Webhook handles outbound campaign calls only. Inbound call handling deferred. |

### Deferred Features

| Feature | Status | Notes |
|---|---|---|
| Google Calendar OAuth + API | **Phase 11 — Planned** | Full spec in `docs/courtside-integrations-plan.md`. Multiple accounts + sub-calendars. Per-campaign assignment. |
| Outlook Calendar OAuth + API | **Phase 11 — Planned** | Same plan as Google. Microsoft Graph API. |
| CRM Integration (HubSpot) | **Phase 11 — Planned** | Full spec in `docs/courtside-integrations-plan.md`. One CRM at a time. Lead import + activity pushback. |
| Daily Summary Email | Deferred | Morning digest with yesterday's stats. Valuable but not core. |
| Inbound Call Post-Call Analysis | Deferred | Contact matching by phone number, create unknown contacts from AI extraction. |
| SMS Auto-Response / Chatbot | Future | Automated replies to inbound SMS. |
| Payment Failure Feature Gating | Future | Restrict features on failed payment, grace periods. |
| Usage-Based Billing | Future | Per-minute tracking for select customers. |

---

## 2. Entity Relationship Overview

```
Organization (org)
├── Users (team members)
├── Contacts (people / companies)
│   └── Leads (contact's journey in a campaign)
│       └── Appointments
├── Campaigns
│   ├── Campaign Schedules
│   └── Leads (many-to-many: a contact can be a lead in multiple campaigns)
├── Agents (AI voice agents)
├── Calls (linked to lead when possible, standalone for unknown inbound)
├── Action Items (tasks requiring human attention)
├── Phone Numbers
├── DNC List
├── Billing (synced from Stripe)
│   ├── Subscription
│   ├── Invoices
│   └── Usage
├── Verification (business verification status)
├── Compliance Settings
├── Notification Preferences
└── Integrations
```

---

## 3. Enums & Constants

### Lead Statuses
```
New → Contacted → Interested → Appt Set → Showed → Closed Won / Closed Lost / Bad Lead
```

| Value | Description |
|---|---|
| `new` | Lead added to campaign, not yet contacted |
| `contacted` | AI has reached the lead (connected or voicemail) |
| `interested` | Lead expressed interest during call |
| `appt_set` | Appointment booked |
| `showed` | Lead attended the appointment |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal lost |
| `bad_lead` | Wrong number, DNC, invalid |

### Call Outcomes
```
Booked, Interested, Callback, Voicemail, No Answer, Not Interested, Wrong Number, DNC
```

### Call Direction
```
inbound, outbound
```

### Campaign Statuses
```
draft, active, paused, completed
```

### Agent Direction
```
inbound, outbound
```

### Agent Status
```
active, pending, inactive
```

### Phone Number Types
```
texting, inbound
```

### Action Item Types
```
sms_reply, callback_request, hot_lead, email_engagement, manual_booking_needed
```

### Action Item Resolution Types
```
appointment_scheduled, followup_scheduled, not_interested, wrong_number, dismissed
```

### Verification Status
```
not_started, in_progress, approved, rejected
```

### User Roles
```
owner, admin, member
```

### Notification Channels
```
push, sms, email
```

### Contact Interaction Types (for timeline)
```
call, sms, email
```

---

## 4. Database Tables

### 4.1 `organizations`
The top-level tenant entity.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | "Courtside Finance" |
| `industry` | text | "Mortgage Brokerage" |
| `business_type` | text | "LLC" |
| `business_phone` | text | |
| `website` | text | |
| `address` | text | |
| `country` | text | "CA" or "US" |
| `stripe_customer_id` | text | Stripe customer ID |
| `timezone` | text | nullable, e.g., "America/New_York" |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Organization

---

### 4.2 `users`
Team members within an organization. Extends Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Same as `auth.users.id` |
| `org_id` | uuid (FK → organizations) | |
| `first_name` | text | |
| `last_name` | text | |
| `email` | text | |
| `phone` | text | |
| `timezone` | text | "EST" |
| `role` | enum (owner/admin/member/super_admin) | super_admin for internal Courtside team |
| `avatar_url` | text | nullable |
| `status` | text | "active" or "invited" |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Profile, Settings → Team

---

### 4.3 `contacts`
The actual person/company. One record per unique person regardless of how many campaigns they're in.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `first_name` | text | |
| `last_name` | text | |
| `phone` | text | Primary phone, used for matching inbound calls |
| `email` | text | nullable |
| `company` | text | nullable |
| `source` | text | "csv_import", "manual", "inbound_call" |
| `is_dnc` | boolean | Default false. If true, excluded from all campaigns |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(org_id, phone)` — one contact per phone per org.

**Source screens:** Leads page (the "name", "phone", "company" columns come from contact), Lead detail (Contact card)

---

### 4.4 `leads`
A contact's journey through a specific campaign. One contact can have multiple leads (one per campaign).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `contact_id` | uuid (FK → contacts) | |
| `campaign_id` | uuid (FK → campaigns) | |
| `status` | enum (lead_status) | Default "new" |
| `last_call_outcome` | enum (call_outcome) | nullable, denormalized for fast display |
| `last_activity_at` | timestamptz | When the most recent interaction happened |
| `retry_count` | integer | How many call attempts made |
| `max_retries` | integer | Inherited from campaign settings |
| `notes` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(contact_id, campaign_id)` — one lead per contact per campaign.

**Source screens:** Leads page (list + filters), Lead detail view (status management), Campaigns (lead counts), Home (conversion funnel)

---

### 4.5 `campaigns`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `name` | text | |
| `agent_id` | uuid (FK → agents) | nullable for drafts |
| `status` | enum (campaign_status) | Default "draft" |
| `daily_call_limit` | integer | e.g., 150 |
| `max_retries` | integer | e.g., 2 |
| `retry_interval_hours` | integer | e.g., 24 |
| `timezone` | text | e.g., "America/Toronto" |
| `end_date` | date | nullable (optional end date) |
| `total_leads` | integer | Denormalized count |
| `calls_made` | integer | Denormalized count |
| `calls_connected` | integer | Denormalized count |
| `bookings` | integer | Denormalized count |
| `total_duration_minutes` | integer | Denormalized |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Campaigns page (list, stats), Campaign wizard (steps 1–4), Home (active campaigns cards, conversion funnel)

---

### 4.6 `campaign_schedules`
Per-day calling windows for a campaign.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `campaign_id` | uuid (FK → campaigns) | |
| `day_of_week` | integer | 0=Mon, 6=Sun |
| `enabled` | boolean | |
| `slots` | jsonb | Array of `{start: "18:00", end: "20:00"}` |
| `created_at` | timestamptz | |

**Source screens:** New Campaign wizard → Step 3 (Schedule)

---

### 4.7 `agents`
AI voice agent configurations. Mirrors what's set up in Retell.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `retell_agent_id` | text | nullable (populated when configured in Retell) |
| `name` | text | "Sarah — Mortgage Specialist" |
| `agent_type` | text | "Mortgage", "Insurance", "Commercial Lending", "General", "Custom" |
| `direction` | enum (inbound/outbound) | |
| `status` | enum (active/pending/inactive) | |
| `voice_gender` | text | "Female" or "Male" |
| `purpose_description` | text | Free-text description of role/tone |
| `campaign_goals` | jsonb | Array of selected goals |
| `preferred_greeting` | text | nullable |
| `additional_notes` | text | nullable |
| `phone_number_id` | uuid (FK → phone_numbers) | nullable, only for inbound agents |
| `total_calls` | integer | Denormalized |
| `total_bookings` | integer | Denormalized |
| `booking_rate` | numeric | Denormalized percentage |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Agents (list + detail), Agent request form, Campaign wizard (agent selection)

---

### 4.8 `calls`
Every call made or received. Core activity record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `retell_call_id` | text | Retell's call identifier |
| `lead_id` | uuid (FK → leads) | nullable (inbound from unknown) |
| `contact_id` | uuid (FK → contacts) | nullable (try to match by phone) |
| `agent_id` | uuid (FK → agents) | |
| `campaign_id` | uuid (FK → campaigns) | nullable (inbound may not belong to campaign) |
| `phone_number_id` | uuid (FK → phone_numbers) | Which number was used |
| `direction` | enum (inbound/outbound) | |
| `caller_phone` | text | The lead/contact's phone number |
| `outcome` | enum (call_outcome) | |
| `duration_seconds` | integer | |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | |
| `recording_url` | text | Retell-hosted URL |
| `transcript_url` | text | Retell-hosted URL, nullable |
| `transcript_text` | text | Full transcript text for search, nullable |
| `ai_summary` | text | Post-call AI analysis |
| `summary_one_line` | text | Short summary for lists, notifications, action items |
| `sentiment` | text | "positive", "neutral", "negative" |
| `engagement_level` | text | "high", "medium", "low" |
| `outcome_confidence` | numeric | 0–1 confidence score from AI analysis |
| `metadata` | jsonb | Full Retell analysis: financial_details, objections, topics, follow_up, compliance flags, etc. |
| `created_at` | timestamptz | |

**Source screens:** Calls page (list + filters + stats), Call detail (summary, transcript, recording player), Home (call outcomes chart, conversion funnel)

---

### 4.9 `appointments`
Booked appointments tied to leads.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `lead_id` | uuid (FK → leads) | |
| `contact_id` | uuid (FK → contacts) | Denormalized for easy queries |
| `campaign_id` | uuid (FK → campaigns) | Denormalized |
| `call_id` | uuid (FK → calls) | The call that booked this appointment, nullable |
| `scheduled_at` | timestamptz | The appointment date/time |
| `duration_minutes` | integer | Default 30 |
| `status` | text | "scheduled", "showed", "no_show", "cancelled", "rescheduled" |
| `notes` | text | nullable |
| `calendar_provider` | text | "google", "outlook", or null (not synced) |
| `calendar_event_id` | text | nullable, provider-agnostic event ID |
| `calendar_synced_at` | timestamptz | nullable, when last synced to calendar |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Calendar page (grid, upcoming list, detail panel), Home (Today's Appointments), Lead detail (timeline shows "Booked Thu 10:30 AM")

---

### 4.10 `action_items`
Tasks requiring human attention, generated by AI or system events.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `contact_id` | uuid (FK → contacts) | |
| `lead_id` | uuid (FK → leads) | nullable |
| `call_id` | uuid (FK → calls) | nullable, the call that triggered this |
| `campaign_name` | text | Denormalized for display |
| `type` | enum (action_item_type) | sms_reply, callback_request, etc. |
| `title` | text | Short description |
| `description` | text | Full context |
| `is_resolved` | boolean | Default false |
| `resolved_at` | timestamptz | nullable |
| `resolution_type` | enum (resolution_type) | nullable |
| `resolution_detail` | text | nullable, e.g., "Follow-up Scheduled · 2:00 PM" |
| `created_at` | timestamptz | |

**Source screens:** Home → Action Items section (list with resolve/follow-up dropdowns)

---

### 4.11 `phone_numbers`
Twilio phone numbers managed by the org.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `twilio_sid` | text | Twilio phone number SID |
| `number` | text | E.164 format |
| `friendly_name` | text | "(555) 200-1000" |
| `type` | enum (texting/inbound) | |
| `assigned_to` | text | Campaign name or agent name |
| `agent_id` | uuid (FK → agents) | nullable, for inbound numbers |
| `campaign_id` | uuid (FK → campaigns) | nullable, for texting numbers |
| `total_texts_sent` | integer | Denormalized |
| `total_calls_handled` | integer | Denormalized |
| `status` | text | "active", "inactive" |
| `created_at` | timestamptz | |

**Source screens:** Settings → Billing → Your Phone Numbers

---

### 4.12 `dnc_list`
Do Not Call entries.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `phone` | text | E.164 format |
| `reason` | text | "manual", "verbal_dnc", "sms_stop", "wrong_number", "national_registry" |
| `source_call_id` | uuid (FK → calls) | nullable |
| `added_by` | uuid (FK → users) | nullable (null if auto-added) |
| `created_at` | timestamptz | |

**Unique constraint:** `(org_id, phone)`

**Source screens:** Settings → Compliance → DNC Management

---

### 4.13 `subscriptions` (Stripe sync)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `stripe_subscription_id` | text | |
| `plan_name` | text | "Professional" |
| `price_monthly` | numeric | 299.00 |
| `call_minutes_limit` | integer | 5000 |
| `call_minutes_used` | integer | 2847 |
| `phone_numbers_limit` | integer | 5 |
| `phone_numbers_used` | integer | 3 |
| `status` | text | "active", "past_due", "canceled" |
| `current_period_start` | timestamptz | |
| `current_period_end` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Billing (plan card, usage bars)

---

### 4.14 `invoices` (Stripe sync)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `stripe_invoice_id` | text | |
| `period_label` | text | "Feb 2026" |
| `amount` | numeric | 299.00 |
| `status` | text | "paid", "open", "void" |
| `invoice_url` | text | Stripe-hosted invoice URL |
| `created_at` | timestamptz | |

**Source screens:** Settings → Billing → Recent Invoices

---

### 4.15 `verification`
Business verification status and data.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | unique |
| `status` | enum (verification_status) | |
| `country` | text | "CA" or "US" |
| `legal_business_name` | text | |
| `dba_name` | text | nullable |
| `tax_id` | text | BN (Canada) or EIN (US) |
| `business_type` | text | |
| `state_registration_number` | text | |
| `province_or_state` | text | |
| `business_address` | text | |
| `website_url` | text | |
| `industry` | text | |
| `rep_full_name` | text | Authorized representative |
| `rep_job_title` | text | |
| `rep_email` | text | |
| `rep_phone` | text | |
| `rep_dob` | date | |
| `submitted_at` | timestamptz | nullable |
| `registration_type` | text | nullable |
| `reviewed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Verification (2-step form with country selector)

---

### 4.16 `compliance_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | unique |
| `casl_enabled` | boolean | Default true |
| `auto_sms_stop` | boolean | Default true |
| `auto_verbal_dnc` | boolean | Default true |
| `auto_email_unsub` | boolean | Default true |
| `national_dnc_check` | boolean | Default true |
| `terms_accepted_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Source screens:** Settings → Compliance (toggles, TOS status, auto opt-out rules)

---

### 4.17 `notification_preferences`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | unique |
| `preferences` | jsonb | `{ "appointment_booked": {"push": true, "sms": true, "email": true}, "hot_lead_alert": {...}, ... }` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Notification types:** appointment_booked, hot_lead_alert, sms_reply_received, campaign_completed, daily_summary_digest, agent_status_change, verification_update

**Source screens:** Settings → Profile → Notification Preferences (checkbox grid)

---

### 4.18 `integrations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `service_name` | text | "google_calendar", "hubspot", etc. |
| `status` | text | "connected", "disconnected", "coming_soon" |
| `config` | jsonb | OAuth tokens, settings, etc. (encrypted) |
| `connected_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

**Source screens:** Settings → Integrations

---

### 4.19 `sms_messages`
SMS sent/received via Twilio.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `contact_id` | uuid (FK → contacts) | nullable |
| `lead_id` | uuid (FK → leads) | nullable |
| `phone_number_id` | uuid (FK → phone_numbers) | Which org number sent/received |
| `twilio_sid` | text | |
| `direction` | text | "inbound" or "outbound" |
| `from_number` | text | |
| `to_number` | text | |
| `body` | text | |
| `status` | text | "sent", "delivered", "failed", "received" |
| `created_at` | timestamptz | |

**Source screens:** Lead detail → Timeline (SMS entries), Action Items (SMS reply triggers)

---

### 4.20 `emails`
Email interactions tracked.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `contact_id` | uuid (FK → contacts) | nullable |
| `lead_id` | uuid (FK → leads) | nullable |
| `subject` | text | |
| `type` | text | "confirmation", "followup", "campaign" |
| `status` | text | "sent", "opened", "clicked", "bounced" |
| `sent_at` | timestamptz | |
| `created_at` | timestamptz | |

**Source screens:** Lead detail → Timeline (email entries), Action Items (email engagement triggers)

---

### 4.21 `notifications`
In-app notification history for the notification bell / dropdown.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `user_id` | uuid (FK → users) | Which team member this is for |
| `type` | text | "appointment_booked", "hot_lead_alert", "sms_reply_received", "callback_requested", "campaign_completed", "agent_status_change", "verification_update" |
| `title` | text | "New Appointment Booked" |
| `body` | text | "Sarah Mitchell — Thu Feb 19, 10:30 AM" |
| `reference_type` | text | "appointment", "lead", "campaign", "call" |
| `reference_id` | uuid | ID of the related record (for click-through navigation) |
| `is_read` | boolean | Default false |
| `read_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

**Source screens:** Notification bell in sidebar/header (unread count badge + dropdown list)

---

### 4.22 `workflow_events`
Tracks N8N webhook processing for auditability.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | nullable |
| `event_type` | text | "post_call_webhook", "campaign_start", "sms_received", etc. |
| `source` | text | "retell", "twilio", "stripe", "n8n" |
| `payload` | jsonb | Raw webhook payload |
| `status` | text | "received", "processing", "completed", "failed" |
| `error_message` | text | nullable |
| `processed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

**Source screens:** Not directly shown in UI. Backend auditability.

---

## 5. Screen-to-Table Mapping

### Home Page (Dashboard)
| UI Element | Tables Read | Tables Written |
|---|---|---|
| "Good morning, Alex" | `users` | — |
| Today's Appointments | `appointments` + `contacts` | — |
| Action Items | `action_items` + `contacts` | `action_items` (resolve) |
| Results metrics (Appointments, Revenue, Hours Saved, Pipeline) | `appointments`, `leads`, `calls` (aggregated) | — |
| Engaged Leads breakdown | `leads` (count by status) | — |
| Call Outcomes chart | `calls` (count by outcome) | — |
| Conversion Funnel | `leads`, `calls`, `appointments` (aggregated) | — |
| Active Campaigns cards | `campaigns` | — |

### Campaigns Page
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Stats bar (Total, Active, Leads, Bookings) | `campaigns` | — |
| Campaign list with progress | `campaigns` + `agents` | — |
| Pause/Resume button | — | `campaigns` (status) |
| Add Leads button | — | `contacts`, `leads` |

### New Campaign Wizard
| Step | Tables Written |
|---|---|
| Step 1 — Select Agent | (state only, no write yet) |
| Step 2 — Name + Add Leads | `campaigns` (create), `contacts` (upsert from CSV), `leads` (create per contact) |
| Step 3 — Schedule + Rules | `campaign_schedules`, `campaigns` (settings) |
| Step 4 — Review & Launch | `campaigns` (status → active or draft) |

### Leads Page
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Stats bar (Total, Follow-ups, Appointments, New) | `leads` | — |
| Search + filters | `leads` + `contacts` (joined) | — |
| Lead table | `leads` + `contacts` | — |
| Lead detail — Contact card | `contacts` | — |
| Lead detail — Status management | `leads` | `leads` (status change) |
| Lead detail — Timeline | `calls` + `sms_messages` + `emails` (for this contact) | — |
| Call Now / Text / Email buttons | — | `calls` (initiate), `sms_messages`, `emails` |

### Calls Page
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Stats bar (Total, Today, Connected, Booked) | `calls` | — |
| Direction/Outcome/Campaign filters | `calls` + `campaigns` | — |
| Call table | `calls` + `agents` | — |
| Call detail — metadata | `calls` | — |
| Call detail — AI Summary | `calls` (ai_summary) | — |
| Call detail — Recording player | `calls` (recording_url) | — |
| Call detail — Transcript | `calls` (transcript_text) | — |
| Call Again button | — | `calls` (new call initiated) |

### Calendar Page
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Stats (Today, This Week, This Month, Show Rate) | `appointments` | — |
| Calendar grid with appointment pills | `appointments` + `contacts` + `campaigns` | — |
| Upcoming This Week list | `appointments` + `contacts` | — |
| Appointment detail panel | `appointments` + `contacts` + `calls` | — |
| Reschedule / Cancel buttons | — | `appointments` (update) |

### Settings → Profile
| UI Element | Tables Read | Tables Written |
|---|---|---|
| User info form | `users` | `users` |
| Notification preferences grid | `notification_preferences` | `notification_preferences` |

### Settings → Billing
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Plan card + usage bars | `subscriptions` | — |
| Cost breakdown stats | `subscriptions` | — |
| Recent Invoices | `invoices` | — |
| Your Phone Numbers | `phone_numbers` + `agents` | — |
| Stripe Billing Portal link | `organizations` (stripe_customer_id) | — |

### Settings → Organization
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Org details form | `organizations` | `organizations` |

### Settings → Team
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Team member list | `users` | — |
| Invite Member | — | `users` (create invite) |
| Remove member | — | `users` (deactivate) |

### Settings → Agents
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Agent list with stats | `agents` + `phone_numbers` | — |
| Agent request form | — | `agents` (create with pending status) |

### Settings → Verification
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Status banner | `verification` | — |
| Business Details form | `verification` | `verification` |
| Representative form | `verification` | `verification` |

### Settings → Integrations
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Integration list | `integrations` | — |
| Connect button | — | `integrations` (OAuth flow) |

### Settings → Compliance
| UI Element | Tables Read | Tables Written |
|---|---|---|
| Compliance status | `compliance_settings`, `verification` | — |
| CASL toggle | `compliance_settings` | `compliance_settings` |
| DNC Management | `dnc_list` (count, stats) | `dnc_list` (add/import) |
| Auto Opt-Out Rules | `compliance_settings` | `compliance_settings` |

---

## 6. Backend Functions & APIs

### Supabase Edge Functions (auth-gated)

| Function | Method | Purpose | Triggered By |
|---|---|---|---|
| `initiate-call` | POST | Start outbound call via Retell API | "Call Now" / "Call Again" buttons |
| `send-sms` | POST | Send SMS via Twilio | "Text" button, confirmation SMS |
| `send-email` | POST | Send email (transactional) | "Email" button, confirmation email |
| `import-leads` | POST | Parse CSV, upsert contacts, create leads, DNC check | Campaign wizard step 2, Leads page Import |
| `create-campaign` | POST | Create campaign + schedules, validate agent | Campaign wizard step 4 |
| `update-campaign-status` | PATCH | Pause/resume/complete campaign | Campaign list buttons |
| `update-lead-status` | PATCH | Change lead status + create related records | Lead detail status buttons |
| `resolve-action-item` | PATCH | Mark action item resolved with type/detail | Home page Action Items |
| `create-appointment` | POST | Create appointment, optional calendar sync | Action item → "Appointment Scheduled" |
| `reschedule-appointment` | PATCH | Update appointment time | Calendar panel |
| `cancel-appointment` | PATCH | Cancel appointment | Calendar panel |
| `submit-agent-request` | POST | Create agent record with pending status | Agent request form |
| `submit-verification` | POST | Save verification data, trigger review | Verification form |
| `stripe-portal-url` | GET | Generate Stripe billing portal session URL | "Open Stripe Billing Portal" |
| `dashboard-stats` | GET | Aggregated dashboard metrics | Home page load |
| `check-availability` | GET | Read broker's Google/Outlook Calendar + existing appointments, return open slots | Retell agent during live call |
| `sync-appointment-to-calendar` | POST | Write/update/delete appointment in Google/Outlook Calendar | N8N after appointment create/update/cancel |
| `get-notifications` | GET | Fetch unread + recent notifications for current user | Notification bell in header |
| `mark-notifications-read` | PATCH | Mark one or all notifications as read | User clicks notification or "mark all read" |

### N8N Webhooks (external → N8N → Supabase)

| Webhook | Source | N8N Actions |
|---|---|---|
| `retell/post-call` | Retell | Parse call data → insert `calls` → update `leads` status/outcome → update campaign stats → create `action_items` if needed → update agent stats |
| `twilio/sms-received` | Twilio | Insert `sms_messages` → check for STOP keyword → update `dnc_list` → create `action_items` |
| `stripe/webhook` | Stripe | Sync `subscriptions` → sync `invoices` → update usage counters |
| `campaign/process-next` | N8N scheduler | Pick next lead → check DNC → check schedule window → call via Retell API → log `workflow_events` |

### N8N Scheduled Workflows

| Workflow | Schedule | Purpose |
|---|---|---|
| Campaign processor | Every 1 min (during active windows) | Process active campaigns: pick next uncalled lead, initiate call via Retell |
| Daily summary | Daily 8 AM per timezone | Generate daily digest email for users with that notification enabled |
| Usage sync | Hourly | Reconcile call minutes usage with Retell/Stripe |

---

## 7. Post-Call Analysis — Structured Data Schema

This section defines **exactly** what data we need extracted from every call. This drives what we configure in Retell's post-call analysis prompt and what structured JSON we expect in the webhook payload. Everything downstream (automation chains, action items, notifications, dashboard metrics) depends on getting this data right.

### 7.1 What Retell Gives Us Automatically (Basic Webhook Data)

These fields come standard from Retell without any custom analysis configuration:

| Field | Type | Description |
|---|---|---|
| `call_id` | string | Retell's unique call identifier |
| `agent_id` | string | Which Retell agent handled the call |
| `call_status` | string | "ended", "error", "voicemail", etc. |
| `start_timestamp` | number | Unix timestamp of call start |
| `end_timestamp` | number | Unix timestamp of call end |
| `duration_ms` | number | Total call duration in milliseconds |
| `recording_url` | string | URL to hosted recording |
| `transcript` | string | Full transcript text |
| `transcript_object` | array | Turn-by-turn transcript with speaker labels + timestamps |
| `from_number` | string | Caller phone number |
| `to_number` | string | Called phone number |
| `direction` | string | "inbound" or "outbound" |
| `disconnection_reason` | string | "agent_hangup", "user_hangup", "voicemail_reached", etc. |
| `call_analysis` | object | **Custom structured data — we define this (see below)** |

### 7.2 What We Need Extracted (Custom Post-Call Analysis)

This is the structured JSON we configure Retell to extract via its post-call analysis prompt. Every field here maps to something our system needs to function.

```json
{
  "call_analysis": {

    // ─── OUTCOME CLASSIFICATION (drives automation chains) ───
    "outcome": "booked | interested | callback | voicemail | no_answer | not_interested | wrong_number | dnc",
    "outcome_confidence": 0.95,
    "outcome_reasoning": "Lead agreed to Thursday 10:30 AM appointment for refinancing consultation.",

    // ─── APPOINTMENT DATA (only when outcome = "booked") ───
    "appointment": {
      "date": "2026-02-19",
      "time": "10:30",
      "timezone": "America/Toronto",
      "duration_minutes": 30,
      "confirmed_by_lead": true
    },

    // ─── CALLBACK DATA (only when outcome = "callback") ───
    "callback": {
      "requested_date": "2026-02-18",
      "requested_time": "14:00",
      "timezone": "America/Toronto",
      "is_specific_time": true,
      "notes": "Lead was driving, asked to be called back at 2 PM today"
    },

    // ─── AI SUMMARY (for dashboard, notifications, broker context) ───
    "summary": "Sarah Mitchell expressed strong interest in refinancing her current mortgage at 6.2%. She's looking to lower monthly payments and is open to exploring fixed and variable rate options. Agreed to a consultation Thursday at 10:30 AM.",
    "summary_one_line": "Strong refinancing interest at 6.2%. Booked Thu 10:30 AM consultation.",

    // ─── SENTIMENT & ENGAGEMENT ───
    "sentiment": "positive | neutral | negative",
    "engagement_level": "high | medium | low",
    "lead_talked_percentage": 45,

    // ─── CONTACT INFORMATION (especially important for inbound/unknown) ───
    "contact_info_extracted": {
      "first_name": "Sarah",
      "last_name": "Mitchell",
      "company": "First National Lending",
      "email": null,
      "alternate_phone": null
    },

    // ─── FINANCIAL DETAILS (industry-specific, for broker context) ───
    "financial_details": {
      "current_rate": "6.2%",
      "desired_rate": null,
      "loan_amount": null,
      "property_type": "primary residence",
      "mortgage_type": "refinance",
      "timeline": "exploring now",
      "other_details": "Looking to lower monthly payments. Has been with current lender for 3 years."
    },

    // ─── INSURANCE DETAILS (when agent type = insurance) ───
    "insurance_details": {
      "policy_type": "whole life | term life | auto | home | commercial | null",
      "current_coverage": null,
      "coverage_needed": null,
      "family_situation": null,
      "other_details": null
    },

    // ─── OBJECTIONS & CONCERNS ───
    "objections": [
      {
        "objection": "Worried about closing costs",
        "handled": true,
        "handling_notes": "Agent explained that closing costs can often be rolled into the new mortgage"
      }
    ],

    // ─── KEY TOPICS DISCUSSED (for search and categorization) ───
    "topics": ["refinancing", "rate comparison", "monthly payments", "consultation booking"],

    // ─── FOLLOW-UP INTELLIGENCE ───
    "follow_up": {
      "recommended_action": "Broker should prepare rate comparison sheet before Thursday appointment",
      "lead_questions_unanswered": ["What are the exact closing costs?", "Can the rate be locked in?"],
      "competing_offers_mentioned": false,
      "urgency_level": "medium",
      "best_contact_time": "mornings before 11 AM"
    },

    // ─── DNC / COMPLIANCE FLAGS ───
    "compliance": {
      "dnc_requested": false,
      "profanity_detected": false,
      "third_party_on_call": false,
      "minor_detected": false,
      "recording_consent_given": true
    }
  }
}
```

### 7.3 Where Each Extracted Field Gets Used

| Extracted Field | Stored In | Used By |
|---|---|---|
| `outcome` | `calls.outcome`, `leads.last_call_outcome` | Automation chains, dashboard stats, filters |
| `outcome_confidence` | `calls.metadata` | Future: flag low-confidence outcomes for manual review |
| `outcome_reasoning` | `calls.metadata` | Debug/audit, potential action item context |
| `appointment.date/time` | `appointments.scheduled_at` | Calendar, notifications, lead timeline |
| `appointment.confirmed_by_lead` | `appointments` metadata | Show rate predictions |
| `callback.requested_time` | `action_items.description` | Action item: "Callback requested at 2:00 PM" |
| `callback.is_specific_time` | `action_items` metadata | Priority: specific time = more urgent |
| `summary` | `calls.ai_summary` | Call detail page, broker notifications |
| `summary_one_line` | `action_items.title`, notification body | Home page action items, push notifications |
| `sentiment` | `calls.sentiment` | Dashboard analytics, lead scoring (future) |
| `engagement_level` | `calls.metadata` | Lead quality indicators |
| `lead_talked_percentage` | `calls.metadata` | Call quality analysis |
| `contact_info_extracted` | `contacts` (upsert for inbound unknowns) | Match inbound calls to contacts, create new contacts |
| `financial_details` | `calls.metadata` (jsonb) | Broker prep context, lead detail enrichment |
| `insurance_details` | `calls.metadata` (jsonb) | Same as above, for insurance agents |
| `objections` | `calls.metadata` (jsonb) | Broker prep for follow-ups, agent tuning |
| `topics` | `calls.metadata` (jsonb) | Search, categorization, analytics |
| `follow_up.recommended_action` | `action_items.description` (appended) | Actionable broker guidance |
| `follow_up.lead_questions_unanswered` | `calls.metadata` | Broker prep for callbacks/appointments |
| `follow_up.urgency_level` | `action_items` priority weighting | Sort action items (future) |
| `follow_up.best_contact_time` | `calls.metadata`, `contacts` (future field) | Optimize future call timing |
| `compliance.dnc_requested` | Triggers DNC automation chain | `dnc_list` insert, remove from campaigns |
| `compliance.profanity_detected` | `calls.metadata` | Flag for review |
| `compliance.recording_consent_given` | `calls.metadata` | Compliance audit |

### 7.4 Retell Post-Call Analysis Prompt (Conceptual)

This is the prompt we'll configure in Retell to generate the structured `call_analysis` JSON. The actual prompt will be refined during agent setup, but here's the conceptual structure:

```
You are analyzing a phone call made by an AI voice agent on behalf of a financial services broker.
Extract the following structured data from the call transcript.

OUTCOME CLASSIFICATION:
- "booked": The lead agreed to a specific appointment date and time.
- "interested": The lead expressed interest but did NOT book an appointment.
- "callback": The lead asked to be called back at a later time.
- "voicemail": The call reached voicemail.
- "no_answer": No one answered.
- "not_interested": The lead explicitly declined or said they weren't interested.
- "wrong_number": The person reached was not the intended lead.
- "dnc": The person asked to not be called again, or said "take me off your list."

IMPORTANT: If an appointment was booked, you MUST extract the exact date, time, and timezone.
If a callback was requested, extract the requested date/time if mentioned.

For financial services calls, extract any financial details discussed:
rates, loan amounts, property types, coverage amounts, policy types, timelines.

Note any objections raised and whether the agent handled them successfully.
Identify unanswered questions the lead asked that the broker should prepare for.

Return a valid JSON object matching the schema provided.
```

### 7.5 What Changes on the `calls` Table

The existing `calls` table already has `ai_summary`, `sentiment`, `transcript_text`, `recording_url`, and `metadata` (jsonb). The `metadata` field is where most of the extracted analysis lives. But we should add a few first-class fields that are queried frequently:

| New Column | Type | Notes |
|---|---|---|
| `outcome_confidence` | numeric | 0–1 confidence score from AI analysis |
| `engagement_level` | text | "high", "medium", "low" |
| `summary_one_line` | text | Short summary for lists, notifications |

These are promoted out of `metadata` because they'll be filtered/sorted on frequently.

### 7.6 Industry-Specific Analysis by Agent Type

Different agent types need different extraction focus. The Retell post-call analysis prompt should be customized per agent:

| Agent Type | Extra Extraction Focus |
|---|---|
| **Mortgage** | Current rate, desired rate, loan amount, property type (primary/investment/commercial), mortgage type (purchase/refinance/HELOC), pre-approval status, current lender |
| **Insurance** | Policy type (whole/term/auto/home/commercial), current coverage, coverage needed, family situation, employer benefits, health considerations mentioned |
| **Commercial Lending** | Business type, revenue range, loan purpose, collateral, existing business loans, business age |
| **General Financial** | All of the above as applicable — wider extraction net |

This means when we configure an agent in Retell, the post-call analysis prompt includes the relevant industry extraction section. The `agents.agent_type` field determines which prompt variant is used.

---

## 8. Post-Call Automation Flows

This is the event-driven system that fires after a call completes and the data lands in the database. Different call outcomes trigger different automated response chains. All of these are orchestrated by N8N after the Retell post-call webhook is processed.

### The Master Flow: What Happens After Every Call

```
Retell post-call webhook arrives
  → N8N receives it
  → Insert into `calls` table (recording_url, transcript, ai_summary, outcome, duration)
  → Match to contact by phone number (create contact if inbound + unknown)
  → Match to lead if campaign context exists
  → Update `leads.status` and `leads.last_call_outcome` based on outcome
  → Update campaign denormalized stats (calls_made, calls_connected, bookings)
  → Update agent denormalized stats (total_calls, total_bookings, booking_rate)
  → Log `workflow_events` entry
  → THEN trigger outcome-specific automation chain (see below)
```

### Outcome-Specific Automation Chains

#### Outcome: `Booked` (Appointment Scheduled)

This is the richest chain — the most things happen automatically:

| Step | Action | Details |
|---|---|---|
| 1 | Create `appointments` record | `scheduled_at` from AI-extracted date/time, link to lead, contact, campaign, call |
| 2 | Send confirmation SMS to lead | Via Twilio to the lead's phone: "Your appointment is confirmed for Thursday 10:30 AM with Courtside Finance." Insert into `sms_messages`. |
| 3 | Send confirmation email to lead | If email exists on contact. "Your appointment is confirmed..." Insert into `emails`. |
| 4 | Notify broker via SMS | To the broker (user) who owns the campaign: "New appointment booked! Sarah Mitchell - Thu Feb 19, 10:30 AM. Spring Mortgage campaign." |
| 5 | Notify broker via email | Richer email with appointment details, lead info, AI call summary. |
| 6 | Notify broker via push | If push notification preference enabled. |
| 7 | Update lead status | `leads.status` → `appt_set` |
| 8 | Sync to calendar | Queue calendar sync (see Section 8 below) — write appointment to Google/Outlook Calendar |

#### Outcome: `Interested`

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `interested` |
| 2 | Create action item | Type: `hot_lead`. Description includes AI summary of what they're interested in. |
| 3 | Notify broker (push + email) | "Hot Lead Alert: Robert Chen expressed strong interest in refinancing. Spring Mortgage campaign." |
| 4 | No SMS to lead | Don't message the lead yet — the broker should decide next steps via the action item. |

#### Outcome: `Callback`

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `contacted` (stays contacted, not yet interested) |
| 2 | Create action item | Type: `callback_request`. Description: "Requested callback at 2:00 PM today" (time extracted by AI). |
| 3 | Notify broker (push) | "Callback Requested: Lisa Nguyen asked for a callback at 2:00 PM. Insurance Outreach." |
| 4 | No SMS to lead | Wait for broker to act via action item. |

#### Outcome: `Voicemail`

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `contacted` |
| 2 | Increment `leads.retry_count` | Track attempts |
| 3 | No action item | Unless max retries reached, then create one: "Max retries reached — manual follow-up needed." |
| 4 | Campaign processor handles retry | Next retry scheduled automatically based on `retry_interval_hours`. |

#### Outcome: `No Answer`

| Step | Action | Details |
|---|---|---|
| 1 | Keep lead status as `new` or `contacted` | Depending on whether this was first attempt |
| 2 | Increment `leads.retry_count` | |
| 3 | Campaign processor handles retry | Same as voicemail |

#### Outcome: `Not Interested`

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `contacted` (not "bad lead" — they're a valid contact, just not interested now) |
| 2 | No further automation | Lead is skipped in future campaign calls. No action item needed. |

#### Outcome: `Wrong Number`

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `bad_lead` |
| 2 | Flag contact | Optionally mark `contacts.is_dnc = true` or just mark lead as bad |
| 3 | No retry | Skip in campaign |

#### Outcome: `DNC` (Do Not Call)

| Step | Action | Details |
|---|---|---|
| 1 | Update lead status | `leads.status` → `bad_lead` |
| 2 | Add to DNC list | Insert into `dnc_list` with reason `verbal_dnc` and reference to the call |
| 3 | Remove from all active campaigns | Set any other leads for this contact to `bad_lead` across all campaigns |
| 4 | Log workflow event | `dnc_auto_added` event for audit |

### SMS Auto-Response Automation

Separate from calls, when an inbound SMS arrives (Twilio webhook → N8N):

| Trigger | Action |
|---|---|
| Lead replies with "STOP" or similar | Add to `dnc_list` (reason: `sms_stop`). Remove from campaigns. Update `compliance_settings` auto-count. |
| Lead replies with positive text | Create action item (type: `sms_reply`). Notify broker. |
| Lead replies with question | Create action item (type: `sms_reply`). Broker handles manually. |

---

## 9. Calendar Integration Architecture

> **Updated Feb 2026** — This section documents the complete, production-implemented calendar sync system including all Edge Functions, DB triggers, OAuth flows, and the Retell AI agent booking flow.

### 9.1 Design Principle

The AI agent **reads** availability from the calendar. The **database** writes back to the calendar via a centralized DB trigger. The dashboard is always the source of truth.

```
┌─────────────────────────────────────────────────────────────────┐
│                   READS (AI → Calendar)                          │
│                                                                   │
│  During a live call, AI checks what times are available:         │
│  Retell Agent → agent-check-availability Edge Function           │
│    → Reads campaign appointment_schedules (business hours)       │
│    → Reads Google/Outlook Calendar API (busy periods)            │
│    → Reads appointments table (Courtside-booked appointments)    │
│    → Returns available 30-min slots as JSON + speakable text     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              WRITES (Database → Calendar)                         │
│                                                                   │
│  Centralized through ONE path — the DB trigger:                  │
│                                                                   │
│  ANY appointment change (INSERT / UPDATE / DELETE / cancel)      │
│    → DB trigger: trg_appointment_change                          │
│    → Calls: sync-appointment-to-calendar Edge Function           │
│    → Creates/updates/deletes event in Google or Outlook          │
│    → Stores calendar_event_id + sync_status on appointment row   │
│                                                                   │
│  Sources of appointment changes:                                  │
│    • AI agent books via agent-book-appointment                   │
│    • AI agent reschedules via agent-reschedule-appointment        │
│    • Dashboard (broker creates/edits/cancels)                    │
│    • Schedule Callback (action item resolution)                   │
└─────────────────────────────────────────────────────────────────┘
```

**CRITICAL: No Edge Function should ever sync to the calendar directly.** All calendar writes go through the `sync-appointment-to-calendar` function, triggered by the DB trigger. This prevents duplicate events.

### 9.2 Why This Architecture?

1. **Single sync path** — Every appointment change (from AI, dashboard, or API) flows through the same DB trigger → Edge Function. No duplicate events, no missed syncs.
2. **Dashboard is source of truth** — If a broker reschedules from the dashboard, the calendar updates. If they cancel, it cancels.
3. **Works without calendar connected** — If `calendar_connection_id` is NULL on the appointment, the DB trigger skips the sync entirely. Appointments still exist in the database.
4. **Handles both Google and Outlook** — The sync function detects the provider from `calendar_connections.provider` and calls the appropriate API.

### 9.3 Database Tables Involved

#### `appointments` table — Calendar sync columns

| Column | Type | Description |
|---|---|---|
| `calendar_connection_id` | uuid FK → calendar_connections | Which calendar to sync to. NULL = no external sync. Set from campaign's `calendar_connection_id` at booking time. |
| `calendar_event_id` | text | Provider-specific event ID (Google event ID or Outlook event ID). Set by sync function after creating the event. |
| `calendar_provider` | text | `"google"` or `"outlook"`. Set by sync function. |
| `calendar_synced_at` | timestamptz | Last successful sync timestamp. |
| `sync_status` | text | `"pending"`, `"synced"`, `"failed"`, `"not_applicable"`. Set to `pending` on insert if calendar connected, `not_applicable` if not. |

#### `calendar_connections` table

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations | |
| `integration_id` | uuid FK → integrations | The OAuth integration (has access/refresh tokens) |
| `provider` | text | `"google"` or `"outlook"` |
| `provider_calendar_id` | text | Google: `"primary"` or calendar email. Outlook: calendar ID from MS Graph. |
| `calendar_name` | text | Display name (e.g., "Work Calendar") |
| `is_default` | boolean | Whether this is the default calendar for the org |
| `created_at` | timestamptz | |

#### `integrations` table — OAuth tokens

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `org_id` | uuid FK → organizations | |
| `provider` | text | `"google_calendar"`, `"outlook_calendar"`, `"hubspot"` |
| `status` | text | `"active"`, `"needs_reauth"` |
| `account_email` | text | The email of the connected account (for display/disambiguation) |
| `config` | jsonb | `{ access_token, refresh_token, token_expiry, ... }` |

#### `campaigns` table — Calendar linkage

| Column | Type | Description |
|---|---|---|
| `calendar_connection_id` | uuid FK → calendar_connections | The calendar this campaign books into. When AI books an appointment for this campaign, the appointment inherits this value. |
| `default_meeting_duration` | integer | Duration in minutes (default 30). Used by booking functions. |
| `timezone` | text | IANA timezone (e.g., `"America/Toronto"`). Falls back to org timezone if NULL. |
| `booking_enabled` | boolean | If false, AI notes the preferred time but doesn't actually create the appointment. Returns a `booking_disabled` response. |

#### `campaign_appointment_schedules` table — Bookable hours

| Column | Type | Description |
|---|---|---|
| `campaign_id` | uuid FK → campaigns | |
| `day_of_week` | integer | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `start_time` | text | `"9:00 AM"` or `"09:00"` (both formats supported) |
| `end_time` | text | `"5:00 PM"` or `"17:00"` |

### 9.4 The DB Trigger — `trg_appointment_change`

**Migration:** `20260219000000_phase7_triggers.sql` (original), `20260226100000_fix_appointment_trigger.sql` (refined)

```sql
CREATE TRIGGER trg_appointment_change
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_change();
```

**Behavior of `handle_appointment_change()`:**

| Event | Action sent to sync function |
|---|---|
| `INSERT` | `"create"` — creates a new calendar event |
| `UPDATE` (status becomes `cancelled`) | `"delete"` — deletes the calendar event |
| `UPDATE` (any other change, e.g. reschedule) | `"update"` — patches the existing calendar event |
| `DELETE` | `"delete"` — deletes the calendar event |

**Skip condition:** If `calendar_connection_id` is NULL (no external calendar linked), the trigger returns immediately without making any HTTP call.

**Auth:** Reads the service role JWT from Supabase Vault (`vault.decrypted_secrets` where `name = 'service_role_key'`). This is the legacy JWT format (219 chars, starts with `eyJhbG...`), NOT the new hex-format service role key.

**HTTP call:** Uses `pg_net.http_post()` (fire-and-forget async HTTP) to call `sync-appointment-to-calendar` Edge Function with payload:
```json
{ "appointment_id": "uuid", "action": "create" | "update" | "delete" }
```

### 9.5 Edge Functions — Complete Reference

#### `sync-appointment-to-calendar`

**Path:** `supabase/functions/sync-appointment-to-calendar/index.ts`
**Trigger:** DB trigger `trg_appointment_change` (not called directly by any other function)
**Auth:** Service role key (from DB trigger via Vault) or N8N webhook secret
**Deployed with:** `--no-verify-jwt` (auth handled internally)

**What it does:**
1. Receives `{ appointment_id, action }` from DB trigger
2. Fetches the appointment row (including `calendar_connection_id`, `calendar_event_id`, `lead_id`, `campaign_id`)
3. If no `calendar_connection_id` → returns `{ synced: false, reason: "no_calendar_connection" }`
4. Looks up `calendar_connections` → `integrations` to get OAuth tokens
5. Calls `getValidAccessToken()` which auto-refreshes expired tokens
6. Fetches contact details (name, phone, email, company), campaign name, and lead notes for the event description
7. Executes the calendar API call:
   - **create**: Creates new event in Google Calendar or Outlook Calendar
   - **update**: Patches existing event (or creates if `calendar_event_id` is NULL)
   - **delete**: Deletes the event from the calendar
8. Updates appointment row with `calendar_event_id`, `calendar_provider`, `calendar_synced_at`, `sync_status`

**Calendar event content:**
- **Summary:** `{appointment.title}` or `"Appointment with {contact name}"` or `"Appointment — Courtside AI"`
- **Description:** Rich text with campaign name, contact details (name, phone, email, company), appointment notes, and lead notes

**Google Calendar API:**
- Create: `POST /calendar/v3/calendars/{calendarId}/events`
- Update: `PATCH /calendar/v3/calendars/{calendarId}/events/{eventId}`
- Delete: `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}`

**Outlook Calendar API (Microsoft Graph):**
- Create: `POST /v1.0/me/calendars/{calendarId}/events`
- Update: `PATCH /v1.0/me/events/{eventId}`
- Delete: `DELETE /v1.0/me/events/{eventId}`

---

#### `agent-check-availability`

**Path:** `supabase/functions/agent-check-availability/index.ts`
**Trigger:** Retell AI agent (custom tool call during a live phone call)
**Auth:** Service role JWT (Retell sends this in Authorization header)
**Deployed with:** `--no-verify-jwt`

**Retell request format:**
```json
{
  "name": "check_availability",
  "args": { "requested_time_string": "Thursday afternoon" },
  "call": {
    "call_id": "uuid",
    "metadata": { "campaign_id": "...", "org_id": "...", "lead_id": "...", "contact_id": "..." },
    "retell_llm_dynamic_variables": { "first_name": "John", "campaign_id": "..." }
  }
}
```

**What it does:**
1. Parses `requested_time_string` using `_shared/date-parser.ts` (chrono-node NLP + custom patterns)
2. Resolves campaign's timezone, appointment schedules (business hours), and calendar connection
3. For each search date:
   - Gets bookable time windows from `campaign_appointment_schedules`
   - Gets busy periods from Google/Outlook Calendar API (if connected)
   - Gets existing Courtside appointments from DB
   - Computes available 30-min slots
4. Returns response based on parsed confidence:

| Parse confidence | Response pattern |
|---|---|
| `"exact"` (e.g., "Thursday at 2pm") | `available: true/false` — yes/no for that exact slot |
| `"range"` (e.g., "Thursday afternoon") | `available: false, needs_selection: true, alternatives: [...]` |
| `"day_only"` (e.g., "Friday") | `available: false, needs_selection: true, alternatives: [...]` |
| `"none_requested"` (e.g., "earliest available") | `available: false, needs_selection: true, alternatives: [...]` |

**Key design decision (`needs_selection`):** For non-exact queries, ALWAYS returns `available: false` + `needs_selection: true`. This forces the Retell agent to present options and ask the prospect to pick a specific time. Only exact-time queries can return `available: true`, which is the signal for the agent to proceed to booking.

**`speakableResponse` format:**
- Same-day options use time-only: `"On Thursday, March 5th, I have 12:00 PM, 12:30 PM, or 1:00 PM available. Which works best for you?"`
- Multi-day options include dates: `"I have Tuesday, March 4th at 10:00 AM, Wednesday at 2:00 PM, or Thursday at 9:30 AM available."`

---

#### `agent-book-appointment`

**Path:** `supabase/functions/agent-book-appointment/index.ts`
**Trigger:** Retell AI agent (custom tool call after prospect confirms a time)
**Auth:** Service role JWT
**Deployed with:** `--no-verify-jwt`

**Retell request format:**
```json
{
  "name": "book_appointment",
  "args": { "scheduled_at": "2026-02-28T14:00:00-05:00", "duration_minutes": 30, "notes": "..." },
  "call": {
    "call_id": "uuid",
    "metadata": { "campaign_id": "...", "org_id": "...", "lead_id": "...", "contact_id": "..." }
  }
}
```

**What it does:**
1. Validates required fields (campaign_id, lead_id, contact_id, org_id, scheduled_at)
2. Checks `campaign.booking_enabled` — if false, returns `{ booked: false, reason: "booking_disabled" }` with a speakable message noting the preferred time
3. Re-verifies availability (race condition check — slot may have been taken between check and book)
4. **INSERTs appointment into DB** with:
   - `calendar_connection_id` from campaign (inherited)
   - `sync_status: "pending"` if calendar connected, `"not_applicable"` if not
   - `status: "scheduled"`
   - `call_id` (only if valid UUID — Retell test calls use non-UUID IDs)
5. Updates lead status to `appt_set`
6. Fires N8N webhook (`/appointment-created`) for downstream automation
7. Returns `{ booked: true, appointment_id, time, speakableResponse }`

**Calendar sync:** The INSERT into `appointments` automatically fires `trg_appointment_change` → `sync-appointment-to-calendar`. **No inline calendar sync in this function.**

---

#### `agent-reschedule-appointment`

**Path:** `supabase/functions/agent-reschedule-appointment/index.ts`
**Trigger:** Retell AI agent (custom tool call)
**Auth:** Service role JWT
**Deployed with:** `--no-verify-jwt`

**What it does:**
1. Fetches existing appointment, validates it exists and isn't cancelled
2. Re-verifies the new time slot is available
3. **UPDATEs appointment** with new `scheduled_at`
4. Fires N8N webhook (`/appointment-rescheduled`)
5. Returns old time and new time in response

**Calendar sync:** The UPDATE fires `trg_appointment_change` → `sync-appointment-to-calendar` with action `"update"`. **No inline calendar sync in this function.**

### 9.6 OAuth Token Management

**Module:** `supabase/functions/_shared/oauth.ts`

`getValidAccessToken(integrationId, provider)`:
1. Reads `integrations.config` for the access/refresh tokens
2. If `token_expiry` is >5 min in the future → returns existing access token
3. If expired → refreshes via provider's token endpoint:
   - Google: `https://oauth2.googleapis.com/token`
   - Outlook: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
4. Updates `integrations.config` with new tokens
5. If refresh fails → marks integration `status: "needs_reauth"`, returns null

**Required env vars (on Supabase Edge Functions):**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

### 9.7 Date/Time Parsing — `_shared/date-parser.ts`

The AI agent receives natural language time requests from prospects. The date parser converts these to structured data.

**Key technical detail:** chrono-node is given a timezone-shifted reference date via `getReferenceDate()`. This means chrono's output Date object has **campaign-local time in its UTC fields**. Always extract hours/minutes using `getUTCHours()`/`getUTCMinutes()` to avoid double-applying the timezone offset. See Bug #9 in `docs/bug-debugging.md`.

**Parse classifications:**
| Input example | Confidence | Result |
|---|---|---|
| `"Thursday at 2pm"` | `exact` | date + time + ISO |
| `"Thursday afternoon"` | `range` | date + rangeStart/rangeEnd (12:00–17:00) |
| `"Friday"` | `day_only` | date only |
| `"after 4pm"` | `range` | date + rangeStart (16:00) to 23:59 |
| `"next week"` | `range` | Mon–Fri date range |
| `"earliest available"` / `""` | `none_requested` | next 14 days |

### 9.8 Speakable Response Generation — `_shared/speech.ts`

The `generateSpeakableResponse()` function creates natural conversational text for the Retell voice agent to speak. Key behaviors:

- **`needs_selection: true`** (range/day/earliest queries): Presents options naturally with "X, Y, or Z" phrasing. Same-day options use time-only format.
- **`available: true`** (exact match): Confirms the specific time is available.
- **`available: false`** (exact match, no alternatives): Apologizes and suggests checking other times.
- All times formatted in 12-hour with AM/PM for natural speech.

### 9.9 N8N Webhook Integration

Both `agent-book-appointment` and `agent-reschedule-appointment` fire webhooks to N8N for downstream automation:

| Event | Webhook path | Payload |
|---|---|---|
| Appointment created | `{N8N_WEBHOOK_BASE_URL}/appointment-created` | appointment_id, org_id, lead_id, contact_id, campaign_id, source, call_metadata |
| Appointment rescheduled | `{N8N_WEBHOOK_BASE_URL}/appointment-rescheduled` | appointment_id, org_id, lead_id, contact_id, campaign_id, old/new times, reason, source, call_metadata |

These webhooks trigger N8N workflows for: confirmation SMS/email to lead, notification to broker, etc. The N8N webhook is fire-and-forget (non-blocking, errors logged but don't fail the response).

### 9.10 End-to-End Flow: AI Books an Appointment

```
1. Prospect on call says: "How about Thursday afternoon?"
   │
2. Retell Agent → agent-check-availability
   │  args: { requested_time_string: "Thursday afternoon" }
   │  metadata: { campaign_id, org_id, lead_id, contact_id }
   │
3. Edge Function:
   │  - date-parser: "Thursday afternoon" → range, 12:00–17:00
   │  - Gets campaign business hours (campaign_appointment_schedules)
   │  - Gets Google/Outlook busy periods (via calendar API)
   │  - Gets existing DB appointments
   │  - Computes available 30-min slots
   │  - Returns: { available: false, needs_selection: true,
   │              alternatives: [12:00, 12:30, 1:00],
   │              speakableResponse: "On Thursday, I have 12, 12:30, or 1 PM..." }
   │
4. Retell Agent speaks: "On Thursday, I have 12, 12:30, or 1 PM available.
   │                      Which works best for you?"
   │
5. Prospect says: "1 PM works"
   │
6. Retell Agent → agent-check-availability (exact confirmation)
   │  args: { requested_time_string: "Thursday at 1pm" }
   │  Returns: { available: true, ... }
   │
7. Retell Agent → agent-book-appointment
   │  args: { scheduled_at: "2026-03-05T13:00:00-05:00" }
   │
8. Edge Function:
   │  - Re-verifies slot is still available (race condition check)
   │  - INSERTs into appointments table
   │  - Updates lead status → "appt_set"
   │  - Fires N8N webhook (appointment-created)
   │  - Returns: { booked: true, speakableResponse: "Perfect! I've booked
   │              your appointment for Thursday, March 5th at 1:00 PM..." }
   │
9. DB trigger fires: trg_appointment_change (INSERT)
   │  - Reads service_role_key from Vault
   │  - Calls sync-appointment-to-calendar with action: "create"
   │
10. sync-appointment-to-calendar:
    - Fetches appointment → calendar_connection → integration
    - Refreshes OAuth token if needed
    - Creates event in Google/Outlook with rich description
    - Updates appointment: calendar_event_id, sync_status: "synced"
```

### 9.11 Auth Patterns for External Callers

Edge Functions called by external services (Retell, DB triggers, N8N) are deployed with `--no-verify-jwt` and handle auth internally:

| Caller | Auth method | How it works |
|---|---|---|
| **Retell AI** | Service role JWT | Retell is configured with the legacy JWT (219 chars, from Vault). `verifyServiceAuth()` decodes the JWT and checks `payload.role === "service_role"`. |
| **DB trigger** | Service role JWT | `handle_appointment_change()` reads the JWT from `vault.decrypted_secrets`. |
| **N8N** | Webhook secret or service key | `sync-appointment-to-calendar` accepts either `N8N_WEBHOOK_SECRET` or the service role key. |
| **Dashboard** | Supabase user JWT | Functions called from the frontend use standard Supabase auth. |

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` env var in Edge Functions is the new hex format (`sb_secret_...`, 41 chars). The Vault `service_role_key` is the legacy JWT (219 chars). The `verifyServiceAuth()` function in agent functions handles both: direct string comparison with the env var, AND JWT decode to check `role === "service_role"`.

### 9.12 Deployment Notes

All agent Edge Functions and sync functions must be deployed with `--no-verify-jwt`:
```bash
supabase functions deploy agent-check-availability --no-verify-jwt
supabase functions deploy agent-book-appointment --no-verify-jwt
supabase functions deploy agent-reschedule-appointment --no-verify-jwt
supabase functions deploy sync-appointment-to-calendar --no-verify-jwt
```

If deployed without `--no-verify-jwt`, the Supabase API gateway will reject requests from Retell and DB triggers with 401 before the function code even runs.

---

## 10. Notification Delivery System

Notifications are the glue between automation and the broker. Here's exactly how each notification type gets delivered.

### Notification Triggers and Channels

| Event | Push | SMS (to broker) | Email (to broker) | Action Item Created? |
|---|---|---|---|---|
| **Appointment Booked** | Yes | Yes | Yes (with details + AI summary) | No (appointment itself is the record) |
| **Hot Lead Alert** (Interested outcome) | Yes | Yes | No | Yes |
| **SMS Reply Received** | Yes | No | No | Yes |
| **Callback Requested** | Yes | No | No | Yes |
| **Campaign Completed** | Yes | No | Yes (with final stats) | No |
| **Daily Summary Digest** | No | No | Yes (morning email) | No |
| **Agent Status Change** | Yes | No | Yes | No |
| **Verification Update** | Yes | No | Yes | No |

Note: These are the *defaults*. Each broker can customize their preferences in the notification preferences grid (Settings → Profile). The system always checks the `notification_preferences` table before sending.

### Notification Delivery Flow

```
Event occurs (call outcome, SMS received, campaign done, etc.)
  → N8N determines notification type
  → Query `notification_preferences` for the relevant user(s)
  → For each enabled channel:
      Push: Send via push notification service (Firebase/OneSignal)
      SMS: Send via Twilio to the broker's phone (from `users.phone`)
      Email: Send via email service (SendGrid/Postmark) to broker's email
  → Insert into `notifications` table for in-app history (optional)
```

### New Table: `notifications` (In-App Notification History)

This table was missing from the original data model. It stores notification records so the dashboard can show a notification bell with history.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `user_id` | uuid (FK → users) | Which team member this is for |
| `type` | text | "appointment_booked", "hot_lead_alert", etc. |
| `title` | text | "New Appointment Booked" |
| `body` | text | "Sarah Mitchell — Thu Feb 19, 10:30 AM" |
| `reference_type` | text | "appointment", "lead", "campaign", "call" |
| `reference_id` | uuid | ID of the related record (for click-through) |
| `is_read` | boolean | Default false |
| `read_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

**Source screens:** The notification bell icon in the sidebar/header (currently in prototype as `<Bell>` icon but not wired up). This gives us the data to show unread count and notification dropdown.

### Lead-Facing Messages (SMS/Email to the Lead)

These are separate from broker notifications. They're automated messages sent *to the lead*:

| Trigger | SMS to Lead | Email to Lead |
|---|---|---|
| Appointment booked | "Your appointment with Courtside Finance is confirmed for [date/time]." | Calendar invite + confirmation details (if email exists) |
| Appointment reminder (1 day before) | "Reminder: You have an appointment tomorrow at [time] with Courtside Finance." | Reminder email |
| Appointment rescheduled | "Your appointment has been rescheduled to [new date/time]." | Updated calendar invite |
| Appointment cancelled | "Your appointment with Courtside Finance has been cancelled." | Cancellation notice |

These messages use templates stored as configuration (not in the database for V1 — hardcoded in N8N workflows, with placeholder variables like `{contact_name}`, `{appointment_time}`, `{org_name}`). Future versions could have a template editor in the dashboard.

---

---

## 11. Row Level Security (RLS) Policies

All tables use `org_id` for tenant isolation. The pattern:

```sql
-- All tables follow this pattern:
CREATE POLICY "Users can only access their org data"
ON [table_name]
FOR ALL
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
```

### Special cases:

| Table | Policy Notes |
|---|---|
| `users` | Can read all users in same org. Can only update own record (except owner/admin can update roles). |
| `notification_preferences` | User can only read/write their own: `user_id = auth.uid()` |
| `organizations` | Members can read. Only owner can update. |
| `verification` | Members can read. Only owner/admin can write. |
| `compliance_settings` | Members can read. Only owner/admin can write. |
| `workflow_events` | Insert only via service role (N8N). No direct user access. |

### Service role access:
N8N and Retell webhooks use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for insertions from external systems. These writes always include the correct `org_id` resolved from the call/campaign context.

---

## 12. External Service Sync

### Retell AI
| Direction | Data Flow |
|---|---|
| Read (from Retell) | Post-call webhook → call recording URL, transcript, AI summary, duration, outcome |
| Write (to Retell) | Create call via Retell API (agent_id, phone number, lead phone) |
| Future | Agent CRUD via API (currently manual) |

### Twilio
| Direction | Data Flow |
|---|---|
| Read (from Twilio) | Inbound SMS webhook → message body, from number |
| Write (to Twilio) | Send SMS via API, provision phone numbers |

### Stripe
| Direction | Data Flow |
|---|---|
| Read (from Stripe) | Webhooks: subscription updated, invoice paid, usage updated |
| Write (to Stripe) | Create billing portal session, report usage |

### Google Calendar (future)
| Direction | Data Flow |
|---|---|
| Write (to GCal) | Create calendar event when appointment booked |
| Read (from GCal) | Check availability (future feature) |

---

## 13. N8N Workflow Events

Events tracked in `workflow_events` for auditability:

| Event Type | Source | Description |
|---|---|---|
| `post_call_processed` | Retell → N8N | Post-call webhook received and processed |
| `sms_received_processed` | Twilio → N8N | Inbound SMS processed |
| `campaign_call_initiated` | N8N scheduler | Outbound call started for campaign |
| `campaign_call_skipped` | N8N scheduler | Lead skipped (DNC, max retries, outside window) |
| `dnc_auto_added` | N8N | Phone added to DNC from verbal/SMS detection |
| `stripe_webhook_processed` | Stripe → N8N | Billing event synced |
| `daily_summary_sent` | N8N scheduler | Daily digest email dispatched |
| `lead_status_auto_updated` | N8N | Lead status changed based on call outcome |
| `action_item_created` | N8N | New action item generated from call/SMS event |

---

## Appendix: Index Recommendations

Priority indexes for query performance:

```sql
-- Fast lead lookups by campaign and status
CREATE INDEX idx_leads_campaign_status ON leads(campaign_id, status);

-- Fast contact lookup by phone (for inbound call matching)
CREATE INDEX idx_contacts_org_phone ON contacts(org_id, phone);

-- Fast call queries by org, date, outcome
CREATE INDEX idx_calls_org_created ON calls(org_id, created_at DESC);
CREATE INDEX idx_calls_org_outcome ON calls(org_id, outcome);
CREATE INDEX idx_calls_lead ON calls(lead_id);

-- Fast appointment queries by org and date
CREATE INDEX idx_appointments_org_scheduled ON appointments(org_id, scheduled_at);

-- Action items: unresolved first
CREATE INDEX idx_action_items_org_resolved ON action_items(org_id, is_resolved, created_at DESC);

-- DNC check during campaign processing
CREATE INDEX idx_dnc_org_phone ON dnc_list(org_id, phone);

-- Campaign schedules lookup
CREATE INDEX idx_campaign_schedules_campaign ON campaign_schedules(campaign_id);

-- SMS/Email timeline for a contact
CREATE INDEX idx_sms_contact ON sms_messages(contact_id, created_at DESC);
CREATE INDEX idx_emails_contact ON emails(contact_id, created_at DESC);
```

---

## Schema Audit Notes (February 2026)

Verified against live Supabase project `xkwywpqrthzownikeill` on 2026-02-26. Key notes:

1. **`organizations.timezone`** — Exists in DB, was missing from this doc. Added above.
2. **`users.role` enum** — DB already includes `super_admin` (added for Phase 10 Admin Panel). Updated above.
3. **`verification.registration_type`** — Exists in DB, was missing from this doc. Added above.
4. **`appointments` nullability** — DB currently has `lead_id`, `contact_id`, `campaign_id` as NOT NULL. The Calendar & CRM Integrations Plan (Phase 11) requires these to become nullable to support manual appointments. Migration needed.
5. **`phone_numbers` structure** — DB matches this doc (Section 4.11). Phase 10 proposed a different structure — the DB-current version takes precedence.

### Pending Schema Changes (from Integrations Plan)

See `docs/courtside-integrations-plan.md` Section 4 for full details. Summary of changes needed:

**New tables:** `calendar_connections`, `campaign_appointment_schedules`, `calendar_blocks`, `crm_activity_log`

**Modified tables:**
- `contacts` — add `crm_provider` (text), `crm_record_id` (text)
- `campaigns` — add `calendar_connection_id` (uuid FK → calendar_connections)
- `appointments` — add `calendar_connection_id` (uuid FK), `sync_status` (text), `is_manual` (boolean), `title` (text). Make `lead_id`, `contact_id`, `campaign_id` nullable.
- `integrations` — add `account_email` (text), `service_type` (text)
- `leads` — add `import_source` (text)

---

*This document should be used as the blueprint for creating the Supabase migration files and planning all backend development work.*
