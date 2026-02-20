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
| Google Calendar OAuth + API | Prep architecture now, implement later | Edge Function stubs + DB triggers ready. OAuth flow + Calendar API in separate phase. |
| Outlook Calendar OAuth + API | Deferred | Same as Google — prep now, build later. |
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
| `role` | enum (owner/admin/member) | |
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

### Design Principle
The AI agent **reads** availability from the calendar. The **database** writes back to the calendar. The dashboard is always the source of truth.

```
┌─────────────────────────────────────────────────────┐
│                   READS (AI → Calendar)              │
│                                                       │
│  During a call, AI needs to suggest available times:  │
│  Retell Agent → API call → Google/Outlook Calendar    │
│  → "Thursday 10:30 AM is available"                   │
│  → AI offers this slot to the lead                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              WRITES (Database → Calendar)             │
│                                                       │
│  After appointment is created in Supabase:            │
│  N8N detects new appointment (DB trigger or webhook)  │
│  → Create event in Google/Outlook Calendar            │
│  → Store `google_calendar_event_id` on appointment    │
│                                                       │
│  After appointment is rescheduled/cancelled:          │
│  Dashboard updates appointment in Supabase            │
│  → N8N detects change                                 │
│  → Update/delete event in Google/Outlook Calendar     │
└─────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Dashboard is source of truth** — If a broker reschedules from the dashboard, the calendar updates. If they cancel, it cancels. No sync conflicts.
2. **AI doesn't need write access** — The Retell agent only needs read access to check availability. Simpler, safer.
3. **Works without calendar connected** — If a broker hasn't connected their calendar, the system still works. Appointments exist in the database. Calendar sync is optional.
4. **Handles both Google and Outlook** — The write path is in N8N, so we can support multiple calendar providers without changing the core system.

### Calendar Availability Check (During AI Call)

This is the real-time read that happens mid-call:

| Step | Component | Action |
|---|---|---|
| 1 | Retell Agent | AI determines the lead wants to book |
| 2 | Retell → Custom Function | Calls a Supabase Edge Function: `check-availability` |
| 3 | Edge Function | Reads the broker's connected calendar (Google/Outlook API) for the next 5 business days |
| 4 | Edge Function | Also checks `appointments` table for any existing Courtside-booked appointments (in case calendar sync is delayed) |
| 5 | Edge Function | Returns available slots as JSON |
| 6 | Retell Agent | Offers slots to the lead: "I have Thursday at 10:30 or Friday at 2:00 PM" |

### New Edge Function Needed

| Function | Purpose |
|---|---|
| `check-availability` | Called by Retell during a call. Reads Google/Outlook Calendar + existing appointments. Returns available time slots. |
| `sync-appointment-to-calendar` | Called by N8N after appointment created/updated/cancelled. Writes to Google/Outlook Calendar. |

### Changes to `integrations` Table

The `integrations` table already exists but needs specific fields for calendar:

```
config (jsonb) should store:
{
  "access_token": "...",
  "refresh_token": "...",
  "calendar_id": "primary",        // which calendar to read/write
  "token_expires_at": "...",
  "provider": "google" | "outlook"
}
```

### Changes to `appointments` Table

Already has `google_calendar_event_id`. Should add:

| Column | Type | Notes |
|---|---|---|
| `calendar_provider` | text | "google", "outlook", or null (no sync) |
| `calendar_event_id` | text | Renamed from `google_calendar_event_id` to be provider-agnostic |
| `calendar_synced_at` | timestamptz | When the calendar was last synced |

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

*This document should be used as the blueprint for creating the Supabase migration files and planning all backend development work.*
