# Courtside AI — Calendar & CRM Integrations Plan

> **This document is the comprehensive spec for Calendar and CRM integrations.**
> It covers architecture, data model changes, UI flows, backend services, and a phased implementation plan.
> This document amends and extends the existing data model and development plan.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Calendar Integration](#2-calendar-integration)
   - 2.1 [Overview & Concepts](#21-overview--concepts)
   - 2.2 [Connection Flow (OAuth)](#22-connection-flow-oauth)
   - 2.3 [Calendar Selection for Campaigns](#23-calendar-selection-for-campaigns)
   - 2.4 [Availability Checking During Calls](#24-availability-checking-during-calls)
   - 2.5 [Appointment Booking & Calendar Sync](#25-appointment-booking--calendar-sync)
   - 2.6 [Calendar Page — Event Display & Sync](#26-calendar-page--event-display--sync)
   - 2.7 [Manual Appointments & Time Blocks](#27-manual-appointments--time-blocks)
   - 2.8 [Business Hours & Appointment Availability](#28-business-hours--appointment-availability)
   - 2.9 [Calendar Event Template](#29-calendar-event-template)
   - 2.10 [Disconnection & Error Handling](#210-disconnection--error-handling)
   - 2.11 [Token Management](#211-token-management)
3. [CRM Integration](#3-crm-integration)
   - 3.1 [Overview & Concepts](#31-overview--concepts)
   - 3.2 [Connection Flow (OAuth)](#32-connection-flow-oauth)
   - 3.3 [Lead Import Flow](#33-lead-import-flow)
   - 3.4 [Activity Pushback](#34-activity-pushback)
   - 3.5 [CRM Switching & Disconnection](#35-crm-switching--disconnection)
   - 3.6 [HubSpot-Specific Implementation](#36-hubspot-specific-implementation)
4. [Data Model Changes](#4-data-model-changes)
   - 4.1 [New Tables](#41-new-tables)
   - 4.2 [Modified Tables](#42-modified-tables)
   - 4.3 [New Enums](#43-new-enums)
5. [Backend Services](#5-backend-services)
   - 5.1 [Edge Functions](#51-edge-functions)
   - 5.2 [N8N Workflows](#52-n8n-workflows)
   - 5.3 [Next.js API Routes](#53-nextjs-api-routes)
6. [UI Changes](#6-ui-changes)
   - 6.1 [Settings → Integrations Redesign](#61-settings--integrations-redesign)
   - 6.2 [Campaign Wizard Amendments](#62-campaign-wizard-amendments)
   - 6.3 [Calendar Page Amendments](#63-calendar-page-amendments)
   - 6.4 [Leads Page Amendments](#64-leads-page-amendments)
   - 6.5 [Lead Detail Amendments](#65-lead-detail-amendments)
7. [Implementation Plan — Phase 11](#7-implementation-plan--phase-11)
8. [Rules & Constraints](#8-rules--constraints)

---

## 1. Design Principles

These principles govern all integration decisions:

| # | Principle | Detail |
|---|---|---|
| 1 | **Courtside DB is always source of truth** | Every appointment, lead, and activity exists in Courtside first. External services (calendars, CRMs) receive copies. If sync fails, Courtside data is still correct. |
| 2 | **Integrations are optional** | The entire platform works without any integrations connected. Calendar availability falls back to the Courtside appointments table. CRM features simply don't appear. |
| 3 | **Org-level ownership** | Calendar connections and CRM connections belong to the organization, not individual users. Any team member with appropriate permissions can manage them. |
| 4 | **One CRM, many calendars** | Only one CRM can be connected at a time (HubSpot OR Salesforce OR GoHighLevel). Multiple calendar accounts and sub-calendars can be connected simultaneously. |
| 5 | **Fail gracefully** | If an external API is down, Courtside continues working. Sync failures are retried silently, with user notification only on persistent failure. |
| 6 | **Connect first, configure later** | Establishing a connection (OAuth) is separate from configuring how it's used. A newly connected calendar does nothing until assigned to a campaign or enabled on the calendar page. |
| 7 | **Respect external data boundaries** | We read from external calendars (for display and availability) but treat them as read-only in the Courtside UI. We write to external calendars only for Courtside-originated events. |
| 8 | **CRM-imported leads track their origin** | Contacts imported from a CRM always retain their CRM record ID. This enables activity pushback and "View in CRM" deep links. |

---

## 2. Calendar Integration

### 2.1 Overview & Concepts

**Supported providers:** Google Calendar, Microsoft Outlook (via Microsoft Graph API)

**Connection model:** An organization can connect multiple calendar accounts. Each account may expose multiple sub-calendars. Each sub-calendar is treated as an independent "calendar" that can be selected for campaigns or displayed on the calendar page.

**Terminology:**
- **Calendar Account** — An OAuth connection to a Google or Microsoft account (e.g., `alex@gmail.com`)
- **Calendar** — A specific calendar within that account (e.g., "Work Calendar", "Personal"). In Google, this maps to a `calendarId`; in Outlook, to a `calendar.id`.
- **Courtside Calendar** — The built-in calendar that reads from the `appointments` table. Always available, no integration needed.

**Data hierarchy:**
```
Organization
└── Calendar Accounts (integrations table, type: google_calendar | outlook_calendar)
    └── Calendars (calendar_connections table)
        ├── Can be assigned to campaigns (for availability + booking)
        ├── Can be displayed on the calendar page (pull external events)
        └── Receives Courtside appointments (when campaigns book to it)
```

### 2.2 Connection Flow (OAuth)

**Entry point:** Settings → Integrations → Calendar tab → "Connect Google Calendar" or "Connect Outlook Calendar"

**Flow (popup-based):**
1. User clicks "Connect Google Calendar"
2. Popup window opens with Google OAuth consent screen
3. User grants `calendar.readonly` + `calendar.events` scopes (Google) or `Calendars.ReadWrite` (Microsoft)
4. OAuth callback hits our API route → exchanges code for tokens
5. Popup closes, main page refreshes
6. Backend fetches the list of calendars from the account
7. New `integrations` row + `calendar_connections` rows created
8. Settings page now shows the connected account with its calendars listed beneath

**OAuth scopes needed:**

| Provider | Scopes | Purpose |
|---|---|---|
| Google | `https://www.googleapis.com/auth/calendar.readonly` | Read events for availability + display |
| Google | `https://www.googleapis.com/auth/calendar.events` | Create/update/delete events when booking |
| Microsoft | `Calendars.ReadWrite` | Read events + create/update/delete events |
| Microsoft | `offline_access` | Refresh token support |

**What gets stored:**
```jsonc
// integrations table row
{
  "service_name": "google_calendar",
  "status": "connected",
  "config": {
    "access_token": "ya29...",
    "refresh_token": "1//...",
    "token_expires_at": "2026-02-26T15:00:00Z",
    "account_email": "alex@gmail.com",
    "account_id": "google-account-id"
  }
}

// calendar_connections rows (one per sub-calendar)
{
  "integration_id": "<FK to integrations>",
  "provider": "google",
  "provider_calendar_id": "primary",   // or "abc123@group.calendar.google.com"
  "calendar_name": "Work Calendar",
  "color": "#4285f4",                  // from provider
  "is_enabled_for_display": false,     // whether it shows on calendar page
  "sync_direction": "none"             // "pull" | "none" (configured on calendar page)
}
```

### 2.3 Calendar Selection for Campaigns

**Where configured:** Campaign wizard, Step 3 (Schedule), new "Appointment Calendar" section

**Options in the dropdown:**
1. **"Courtside Calendar" (default)** — Availability checked against `appointments` table. Bookings exist only in Courtside DB.
2. **Any connected external calendar** — Listed by name with provider icon (e.g., "📅 Work Calendar (Google)", "📅 Main (Outlook)"). Availability checked against that calendar's API. Bookings created in Courtside DB AND pushed to the external calendar.

**Campaign stores:** `calendar_connection_id` (nullable FK → `calendar_connections`). If `null`, uses Courtside Calendar.

**Rules:**
- A campaign can only have ONE calendar assigned
- The same calendar can be used by multiple campaigns
- Changing a campaign's calendar after launch does NOT retroactively move existing appointments
- If a campaign's assigned calendar is disconnected, the campaign cannot start or continue calling until reassigned (warn & block)

### 2.4 Availability Checking During Calls

**Trigger:** Retell agent calls the `check-availability` Edge Function during a live call when the lead wants to book

**Input:**
```jsonc
{
  "org_id": "uuid",
  "campaign_id": "uuid",
  "requested_datetime": "2026-02-27T14:00:00",  // from AI parsing lead's request
  "timezone": "America/Toronto"
}
```

**Logic:**
1. Look up the campaign's `calendar_connection_id`
2. **If Courtside Calendar (null):**
   - Query `appointments` table for the requested date ± 1 day (excluding past times)
   - Return free/busy based on appointment times + configured business hours
3. **If external calendar:**
   - Call Google Calendar FreeBusy API or Microsoft Graph `/calendarView` for the requested date ± 1 day
   - Apply the campaign's appointment business hours as additional constraints
   - Return available slots within business hours that don't conflict with calendar events

**Output:**
```jsonc
{
  "requested_slot_available": false,
  "alternatives": [
    { "datetime": "2026-02-27T10:30:00-05:00", "available": true },
    { "datetime": "2026-02-27T15:00:00-05:00", "available": true },
    { "datetime": "2026-02-28T09:00:00-05:00", "available": true }
  ]
}
```

**Performance requirement:** <2 seconds response time. Called during live conversation.

**Important:** Availability is checked ONLY against the campaign's assigned calendar. Other connected calendars are not consulted. The campaign's appointment business hours (Section 2.8) provide an additional constraint on top of the calendar's free/busy status.

### 2.5 Appointment Booking & Calendar Sync

**When the AI books an appointment, this is what happens:**

```
AI determines appointment time → Retell webhook fires → N8N post-call workflow runs
  1. INSERT into `appointments` table (always, regardless of calendar type)
  2. If campaign has external calendar assigned:
     → DB trigger fires `sync-appointment-to-calendar` Edge Function
     → Edge Function creates event on the external calendar
     → Updates appointment row: calendar_event_id, calendar_synced_at, calendar_connection_id
  3. If Courtside Calendar:
     → No external sync needed. Appointment exists in DB, visible on calendar page.
```

**Calendar event details (hardcoded V1 template):**
```
Title: "{contact_first_name} {contact_last_name} — Appointment (Courtside)"
Description:
  "Booked by Courtside AI
   Campaign: {campaign_name}
   Phone: {contact_phone}
   Email: {contact_email}

   AI Summary:
   {call_summary_one_line}"
Duration: {appointment_duration_minutes} minutes (default 30)
```

**Sync for updates/cancellations:**
- When an appointment is rescheduled from the Courtside UI → DB trigger fires → Edge Function updates the external calendar event
- When an appointment is cancelled → DB trigger fires → Edge Function deletes the external calendar event
- The external calendar is NEVER the initiator of changes. Courtside DB is always the source of truth.

### 2.6 Calendar Page — Event Display & Sync

**What the calendar page shows:**
1. **Courtside appointments** — Always shown. Colored by campaign. Full detail on click.
2. **External calendar events** — Shown when a connected calendar has display enabled. Visually distinct from Courtside appointments. Read-only (cannot edit from Courtside). Each calendar gets its own color (pulled from the provider or assigned by Courtside).

**Sync direction (per-calendar, configured on the calendar page sidebar):**

| Setting | Behavior |
|---|---|
| **Pull to Courtside** | External events from this calendar are fetched and displayed on the calendar page |
| **None** | Calendar is connected but not displayed on the calendar page (still usable for campaigns) |

Note: There is no "push" toggle on the calendar page. Courtside appointments are pushed to external calendars only via campaign configuration (Section 2.5) or manual appointment creation (Section 2.7).

**Calendar page sidebar:**
- Lists all connected calendars with checkbox toggles and color indicators
- Checkbox controls whether that calendar's events are pulled and displayed
- "Courtside Appointments" is always listed at the top and cannot be hidden
- Color swatches next to each calendar name for visual identification

**How external events are fetched:**
- Fetched on page load for the currently visible month
- When user navigates to a different month, fetch that month's events
- No background caching — fresh fetch each time
- Events are NOT stored in the Courtside DB (fetched live from API, rendered client-side)
- A "Refresh" button allows manual re-fetch without full page reload

**Visual treatment of external events:**
- Show on the calendar grid as pills/blocks, similar to Courtside appointments
- Labeled with event title and time
- Visually distinct: slightly transparent, different border style, or a small icon indicating the source calendar
- Clicking shows a minimal detail panel: title, time, calendar source. No edit actions.
- Each source calendar has its own color (distinct from campaign colors)

### 2.7 Manual Appointments & Time Blocks

**The calendar page supports two types of manual creation:**

#### Manual Appointments
- Created by clicking a time slot or a "New Appointment" button
- Fields: Date/time, duration, contact (optional — searchable dropdown of Courtside contacts), title, notes
- If a contact is linked: creates a proper `appointments` row in the DB, visible in lead timeline, contributes to stats
- If no contact linked: creates a simpler record (title + time only, treated as a personal meeting)
- **External calendar push:** During creation, a dropdown lets the user select which connected calendar to push this appointment to (or "None — Courtside only")
- If pushed to an external calendar, the sync uses the same Edge Function as campaign bookings

#### Time Blocks
- Created by clicking a time slot or a "Block Time" button
- Fields: Date/time, duration, title (e.g., "Lunch", "Focus Time")
- Not linked to any contact or lead
- Stored in a separate `calendar_blocks` table (lightweight)
- **These do NOT affect campaign availability** — campaign availability is checked only against the selected external calendar or Courtside appointments table
- Not pushed to any external calendar
- Displayed on the calendar page in a neutral color (gray)

### 2.8 Business Hours & Appointment Availability

**New concept:** Each campaign has an **appointment availability schedule** that is separate from its **calling schedule**.

- The calling schedule (existing `campaign_schedules` table) controls when the AI makes outbound calls (e.g., 6–9 PM)
- The appointment availability schedule controls when the AI can offer appointment slots (e.g., 9 AM – 5 PM)
- These are independent — a broker may call in the evenings but take meetings during business hours

**Where configured:** Campaign wizard, Step 3, new "Appointment Availability" section (below the calling schedule section)

**Schema:** New `campaign_appointment_schedules` table, same structure as `campaign_schedules`:
```
campaign_appointment_schedules
├── id (uuid, PK)
├── campaign_id (uuid, FK → campaigns)
├── day_of_week (integer, 0=Mon, 6=Sun)
├── enabled (boolean)
├── slots (jsonb) — Array of {start: "09:00", end: "17:00"}
├── created_at (timestamptz)
```

**Default if not configured:** Monday–Friday, 9:00 AM – 5:00 PM in the campaign's timezone.

**How it works with availability checking:**
1. The `check-availability` Edge Function first gets free/busy from the calendar (external or Courtside)
2. Then it intersects those results with the campaign's appointment availability windows
3. Only slots that are BOTH free on the calendar AND within business hours are returned as available

### 2.9 Calendar Event Template

**V1: Hardcoded template** (defined in Section 2.5)

Future enhancement: Allow orgs to customize the event title and description template in Settings → Integrations with placeholder variables like `{contact_name}`, `{campaign_name}`, `{summary}`.

### 2.10 Disconnection & Error Handling

**Disconnection rules:**
- When a user tries to disconnect a calendar account, the system checks if any of that account's calendars are assigned to active campaigns
- If yes: **warn and block**. Show a message listing the campaigns that use this calendar. The user must reassign those campaigns to a different calendar (or Courtside Calendar) before disconnecting.
- If no active campaign dependencies: disconnect immediately. Remove `integrations` row and all associated `calendar_connections` rows. Existing appointment records retain their `calendar_event_id` for reference but `calendar_synced_at` is no longer updated.

**Sync failure handling:**
- If an external calendar API call fails (creating/updating/deleting an event):
  1. Retry once immediately
  2. If retry fails: create the appointment in Courtside DB anyway (data is safe)
  3. Mark the appointment as `sync_status: 'pending'`
  4. A background retry mechanism attempts sync again later (exponential backoff, max 3 retries)
  5. If all retries fail: mark `sync_status: 'failed'`, no user notification (appointment still exists in Courtside)

- The appointment is NEVER blocked by a calendar sync failure. Courtside DB is always written to first.

### 2.11 Token Management

**OAuth tokens expire.** Google access tokens last ~1 hour. Microsoft tokens last ~1 hour.

**Strategy: Silent refresh with failure notification**
1. Before every API call, check if `token_expires_at` is within 5 minutes of now
2. If yes, use the `refresh_token` to obtain a new `access_token`
3. Update `integrations.config` with new tokens
4. If refresh fails (e.g., user revoked access in Google/Microsoft):
   - Set integration `status` to `"needs_reauth"`
   - Show a banner/notification in Courtside: "Your Google Calendar connection needs re-authentication"
   - Campaigns using this calendar continue running but skip calendar sync (appointments still created in Courtside DB)
   - User re-authenticates by clicking "Reconnect" in Settings → Integrations

**Refresh token storage:** Stored in `integrations.config` JSONB. In production, these should be encrypted at rest (Supabase Vault or column-level encryption).

---

## 3. CRM Integration

### 3.1 Overview & Concepts

**Supported CRMs (in order of implementation):**
1. HubSpot (V1)
2. Salesforce (future)
3. GoHighLevel (future)

**Connection model:** An organization can connect to **exactly one** CRM at a time. Connecting a new CRM requires disconnecting the existing one.

**Two core features:**
1. **Lead Import** — Pull contacts from the CRM into Courtside as leads for a campaign (one-time manual import)
2. **Activity Pushback** — When activities happen in Courtside for CRM-imported leads, push those activities back to the CRM contact record in real-time

**Terminology:**
- **CRM Contact** — A record in HubSpot/Salesforce/GoHighLevel
- **CRM Record ID** — The unique identifier for that record in the CRM (e.g., HubSpot `contactId`)
- **CRM-imported lead** — A Courtside contact that has a `crm_record_id` linking it back to the CRM

### 3.2 Connection Flow (OAuth)

**Entry point:** Settings → Integrations → CRM tab → "Connect HubSpot" (or other CRM)

**Flow (popup-based, same pattern as calendar):**
1. User clicks "Connect HubSpot"
2. Popup opens with HubSpot OAuth consent screen
3. User authorizes access
4. OAuth callback → exchange code for tokens
5. Popup closes, Settings page updates
6. New `integrations` row created with `service_name: "hubspot"`

**HubSpot OAuth scopes:**
```
crm.objects.contacts.read    — Read contacts for import
crm.objects.contacts.write   — Update contacts (activity pushback)
crm.lists.read               — Read contact lists for import wizard
crm.schemas.contacts.read    — Read contact properties schema
```

**Activity pushback toggle:** After connecting, the Settings → Integrations → CRM section shows toggles for which activity types sync back (see Section 3.4).

### 3.3 Lead Import Flow

**Available from two places:**
1. Campaign wizard, Step 2 (alongside CSV upload and existing contacts)
2. Leads page, "Import" button → "Import from CRM" option

**Import wizard (4 steps):**

#### Step 1: Choose Source
- Show available import sources based on the connected CRM
- For HubSpot: "Select a HubSpot list or segment", "All contacts with filters"
- The specific options here are CRM-dependent and will be defined per-CRM (see Section 3.6)
- User selects the source (e.g., a specific HubSpot list)

#### Step 2: Preview Contacts
- Show a count of matching contacts: "Found 247 contacts in 'Website Leads' list"
- Display a preview table of the first 20-50 contacts: Name, Phone, Email, Company
- Contacts without a phone number are flagged (phone is required for Courtside)
- Show summary: "247 total, 12 missing phone number (will be skipped), 8 already in Courtside (will be updated)"

#### Step 3: Field Mapping (automatic)
- Show the automatic field mapping:
  ```
  HubSpot firstname  →  Courtside first_name  ✓
  HubSpot lastname   →  Courtside last_name   ✓
  HubSpot phone      →  Courtside phone       ✓
  HubSpot email      →  Courtside email       ✓
  HubSpot company    →  Courtside company     ✓
  ```
- V1: Automatic mapping only, no customization. Display is informational ("This is how we'll map fields")
- Future: Allow custom field mapping

#### Step 4: Confirm & Import
- Final summary: "Import 235 contacts from HubSpot list 'Website Leads'"
- "X new contacts will be created, Y existing contacts will be updated"
- If launched from campaign wizard: "These contacts will be added as leads to campaign '{campaign_name}'"
- If launched from Leads page: contacts are added to Courtside but not assigned to any campaign
- Import button → processing indicator → results summary

**Duplicate handling:**
- Matching is done on `(org_id, phone)` — the existing unique constraint on `contacts`
- If a phone number already exists: UPDATE the existing contact with any new/different info from the CRM (name, email, company)
- Updated contacts retain their existing `crm_record_id` if they had one, or get the new one
- The import results show: "X created, Y updated, Z skipped (no phone)"

**What gets stored on import:**
- `contacts.source` is set to `"crm_import"` for new contacts
- `contacts.crm_provider` is set to `"hubspot"` (or whichever CRM)
- `contacts.crm_record_id` is set to the HubSpot contact ID
- If launched from campaign wizard: a `leads` row is also created linking the contact to the campaign

### 3.4 Activity Pushback

**What it does:** When certain activities happen in Courtside for CRM-imported leads, push those activities to the CRM contact's timeline.

**Which activities (configurable per type in Settings → Integrations → CRM section):**

| Activity Type | Toggle Default | What Gets Pushed |
|---|---|---|
| **Calls** | ON | CRM Call engagement: summary, duration, outcome, timestamp, recording URL (if available) |
| **SMS Sent** | ON | CRM Note: "SMS sent via Courtside: {message_body}" with timestamp |
| **SMS Received** | ON | CRM Note: "SMS received: {message_body}" with timestamp |
| **Emails Sent** | ON | CRM Email engagement: subject, body, timestamp |
| **Appointments Booked** | ON | CRM Note: "Appointment booked for {date/time} via Courtside campaign '{campaign_name}'" |

**Timing:** Real-time. Each activity triggers an immediate push to the CRM.

**Implementation:** After the activity is recorded in Courtside (e.g., call inserted, SMS sent), a webhook or N8N trigger fires that:
1. Checks if the contact has a `crm_record_id`
2. Checks if the org has a connected CRM
3. Checks if the relevant activity type toggle is enabled
4. If all yes: push the activity to the CRM via its API

**CRM-specific formatting:** See Section 3.6 for HubSpot-specific engagement types.

**Scope:** Only CRM-imported leads (contacts with a `crm_record_id`) get activity pushback. CSV-imported or manually created contacts are ignored, even if they exist in the CRM.

**What we do NOT push:**
- Lead status changes (e.g., "New → Contacted → Interested")
- Appointment outcomes (showed, no-show, cancelled)
- Action item creation/resolution
- These are future enhancements

### 3.5 CRM Switching & Disconnection

**Switching CRMs (e.g., HubSpot → Salesforce):**
1. User clicks "Disconnect HubSpot" in Settings → Integrations
2. Warning dialog: "Disconnecting HubSpot will stop activity sync for X CRM-linked contacts. CRM record IDs will be cleared. This cannot be undone."
3. On confirm:
   - Delete the `integrations` row for HubSpot
   - Clear `crm_provider` and `crm_record_id` on all contacts in the org
   - All Courtside data (contacts, leads, calls, etc.) is preserved — only the CRM link is severed
4. User can now connect Salesforce
5. CRM-imported contacts from HubSpot remain in Courtside but are no longer linked to any CRM

**Why clean disconnect:** CRM record IDs are provider-specific (HubSpot IDs are numbers, Salesforce IDs are 18-char strings). Keeping stale IDs from a different CRM would cause confusion and potential errors.

### 3.6 HubSpot-Specific Implementation

**Import sources (Step 1 of wizard):**
- **HubSpot Lists:** Fetch available lists via `GET /crm/v3/lists`. Show list name + contact count. User picks a list.
- **All Contacts:** Option to import all HubSpot contacts (with count shown). May be large — paginate.
- Future: Filter by HubSpot properties (lifecycle stage, lead status, etc.)

**Field mapping (automatic):**

| HubSpot Property | Courtside Field | Notes |
|---|---|---|
| `firstname` | `contacts.first_name` | |
| `lastname` | `contacts.last_name` | |
| `phone` | `contacts.phone` | **Required** — contacts without phone are skipped |
| `email` | `contacts.email` | Optional |
| `company` | `contacts.company` | Optional |

**Activity pushback formats:**

| Courtside Activity | HubSpot Engagement Type | Details |
|---|---|---|
| Call completed | `Call` engagement | `hs_call_body`: AI summary, `hs_call_duration`: seconds, `hs_call_direction`: OUTBOUND/INBOUND, `hs_call_status`: COMPLETED, `hs_timestamp`: call start time |
| Email sent | `Email` engagement | `hs_email_subject`: subject, `hs_email_text`: body, `hs_email_direction`: EMAIL, `hs_timestamp`: sent time |
| SMS sent/received | `Note` engagement | `hs_note_body`: "SMS {direction}: {message_body}", `hs_timestamp`: timestamp |
| Appointment booked | `Meeting` engagement | `hs_meeting_title`: contact name + "Courtside Appointment", `hs_meeting_start_time`: scheduled_at, `hs_meeting_end_time`: calculated, `hs_meeting_body`: campaign name + summary |

**HubSpot API endpoints used:**

| Action | Endpoint | Method |
|---|---|---|
| Fetch contact lists | `/crm/v3/lists` | GET |
| Fetch contacts in a list | `/crm/v3/lists/{listId}/memberships` | GET |
| Fetch all contacts | `/crm/v3/objects/contacts` | GET (paginated) |
| Fetch single contact | `/crm/v3/objects/contacts/{contactId}` | GET |
| Create engagement (call) | `/crm/v3/objects/calls` | POST |
| Create engagement (email) | `/crm/v3/objects/emails` | POST |
| Create engagement (note) | `/crm/v3/objects/notes` | POST |
| Create engagement (meeting) | `/crm/v3/objects/meetings` | POST |
| Associate engagement to contact | `/crm/v4/objects/{objectType}/{objectId}/associations/{toObjectType}/{toObjectId}` | PUT |

**Rate limits:** HubSpot API rate limits are 100 requests per 10 seconds (for OAuth apps). The import flow should batch requests and respect rate limits with appropriate delays.

---

## 4. Data Model Changes

### 4.1 New Tables

#### `calendar_connections`
Represents a specific calendar within a connected calendar account. One integration (account) can have many calendar connections.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | Denormalized for RLS |
| `integration_id` | uuid (FK → integrations) | The parent account connection |
| `provider` | text | `"google"` or `"outlook"` |
| `provider_calendar_id` | text | Calendar ID from provider (e.g., "primary", "abc@group.calendar.google.com") |
| `calendar_name` | text | Display name from provider (e.g., "Work Calendar") |
| `color` | text | Hex color for display (e.g., "#4285f4") |
| `is_enabled_for_display` | boolean | Default false. Whether events show on calendar page |
| `sync_direction` | text | `"pull"` or `"none"`. Default `"none"`. Controls calendar page display |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(integration_id, provider_calendar_id)`
**RLS:** Standard org-based isolation.

#### `campaign_appointment_schedules`
Per-day appointment availability windows for a campaign (separate from calling schedules).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `campaign_id` | uuid (FK → campaigns) | |
| `day_of_week` | integer | 0=Mon, 6=Sun |
| `enabled` | boolean | |
| `slots` | jsonb | Array of `{start: "09:00", end: "17:00"}` |
| `created_at` | timestamptz | |

**Same structure as `campaign_schedules`.** Default: Mon–Fri, 9:00–17:00.

#### `calendar_blocks`
Time blocks created on the calendar page (not linked to contacts, not synced to external calendars, don't affect availability).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `created_by` | uuid (FK → users) | Who created the block |
| `title` | text | e.g., "Lunch", "Focus Time" |
| `starts_at` | timestamptz | |
| `ends_at` | timestamptz | |
| `created_at` | timestamptz | |

**RLS:** Standard org-based isolation.

#### `crm_activity_log`
Tracks activities pushed to the CRM for debugging and sync health.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `org_id` | uuid (FK → organizations) | |
| `contact_id` | uuid (FK → contacts) | |
| `crm_provider` | text | `"hubspot"`, etc. |
| `activity_type` | text | `"call"`, `"sms"`, `"email"`, `"appointment"` |
| `crm_engagement_id` | text | Nullable. The ID returned by the CRM after creation |
| `status` | text | `"success"`, `"failed"`, `"pending"` |
| `payload` | jsonb | The data sent to the CRM |
| `error_message` | text | Nullable. Error details if failed |
| `created_at` | timestamptz | |

**RLS:** Standard org-based isolation.

### 4.2 Modified Tables

#### `contacts` — Add CRM fields

| New Column | Type | Notes |
|---|---|---|
| `crm_provider` | text | Nullable. `"hubspot"`, `"salesforce"`, `"gohighlevel"` |
| `crm_record_id` | text | Nullable. The CRM's ID for this contact |

Update `source` enum to include `"crm_import"` as a valid value.

#### `campaigns` — Add calendar reference and appointment schedule flag

| New Column | Type | Notes |
|---|---|---|
| `calendar_connection_id` | uuid (FK → calendar_connections) | Nullable. If null, uses Courtside Calendar |

#### `appointments` — Add calendar connection reference and sync status

| New Column | Type | Notes |
|---|---|---|
| `calendar_connection_id` | uuid (FK → calendar_connections) | Nullable. Which calendar this was synced to |
| `sync_status` | text | `"synced"`, `"pending"`, `"failed"`, `"not_applicable"`. Default `"not_applicable"` |
| `is_manual` | boolean | Default false. True for manually created appointments |
| `title` | text | Nullable. For manual appointments without a contact link |

Note: `calendar_provider` and `calendar_event_id` and `calendar_synced_at` already exist on this table.

#### `integrations` — Add fields for multi-account support

| New Column | Type | Notes |
|---|---|---|
| `account_email` | text | Nullable. The email of the connected account (for display) |
| `service_type` | text | `"calendar"` or `"crm"`. Helps distinguish calendar integrations from CRM |

#### `leads` — Add CRM source tracking (informational)

| New Column | Type | Notes |
|---|---|---|
| `import_source` | text | Nullable. `"csv"`, `"crm"`, `"manual"`. For filtering/display |

### 4.3 New Enums

```sql
-- Contact source (extend existing)
-- Add 'crm_import' to the allowed values for contacts.source

-- Calendar sync direction
CREATE TYPE calendar_sync_direction AS ENUM ('pull', 'none');

-- Calendar sync status (for appointments)
CREATE TYPE calendar_sync_status AS ENUM ('synced', 'pending', 'failed', 'not_applicable');

-- CRM activity types
CREATE TYPE crm_activity_type AS ENUM ('call', 'sms_sent', 'sms_received', 'email', 'appointment');

-- Integration service types
CREATE TYPE integration_service_type AS ENUM ('calendar', 'crm');
```

---

## 5. Backend Services

### 5.1 Edge Functions

#### `calendar-oauth-callback`
Handles the OAuth callback from Google/Outlook. Exchanges authorization code for tokens, fetches calendar list, creates `integrations` + `calendar_connections` rows.

| Aspect | Detail |
|---|---|
| **Trigger** | OAuth callback redirect |
| **Auth** | Session-based (user must be logged in) |
| **Actions** | Exchange code → store tokens → fetch calendars → create DB rows |

#### `check-availability` (update existing stub)
Updated to support both Courtside Calendar and external calendars, with business hours intersection.

| Aspect | Detail |
|---|---|
| **Trigger** | Retell agent mid-call |
| **Input** | `org_id`, `campaign_id`, `requested_datetime`, `timezone` |
| **Logic** | Look up campaign's calendar → fetch free/busy → intersect with business hours → return slots |
| **Performance** | Must respond in <2 seconds |

#### `sync-appointment-to-calendar` (update existing stub)
Updated to work with `calendar_connections` table. Handles create/update/delete of calendar events.

| Aspect | Detail |
|---|---|
| **Trigger** | DB trigger on `appointments` INSERT/UPDATE/DELETE |
| **Logic** | Check if appointment has calendar_connection_id → refresh token → create/update/delete event via provider API → update appointment sync fields |
| **Retry** | Retry once immediately, then queue for background retry |

#### `crm-oauth-callback`
Handles OAuth callback from HubSpot (and future CRMs).

#### `crm-import-contacts`
Handles the CRM import wizard execution. Fetches contacts from CRM, maps fields, upserts into Courtside.

| Aspect | Detail |
|---|---|
| **Trigger** | Import wizard "Confirm" button |
| **Input** | CRM source (list ID or "all"), org_id, optional campaign_id |
| **Logic** | Paginate through CRM contacts → map fields → upsert contacts → optionally create leads → return results |
| **Rate limiting** | Respect CRM API rate limits (batch requests, add delays) |

#### `crm-push-activity`
Pushes a single activity to the CRM.

| Aspect | Detail |
|---|---|
| **Trigger** | Called by N8N or DB trigger after activity recorded |
| **Input** | contact_id, activity_type, activity_data |
| **Logic** | Check contact has crm_record_id → check toggle enabled → format for CRM → push → log result |

#### `fetch-external-calendar-events`
Fetches events from an external calendar for display on the calendar page.

| Aspect | Detail |
|---|---|
| **Trigger** | Calendar page load / month navigation |
| **Input** | calendar_connection_id, start_date, end_date |
| **Logic** | Refresh token if needed → fetch events from provider API → return formatted events |
| **Not stored in DB** | Events are returned directly to the frontend, not cached |

### 5.2 N8N Workflows

#### CRM Activity Pushback Trigger
Listens for relevant events (call completed, SMS sent, email sent, appointment booked) and calls `crm-push-activity` Edge Function.

**Option A: DB triggers** — Triggers on INSERT to `calls`, `sms_messages`, `emails`, `appointments` tables that fire an Edge Function directly.

**Option B: N8N webhook** — The existing post-call workflow (7.1) adds a step that calls `crm-push-activity` after recording the call. SMS/email/appointment workflows do the same.

**Recommended: Option A (DB triggers)** — Cleaner, doesn't require modifying existing N8N workflows. Each trigger checks if the contact has a `crm_record_id` before proceeding.

### 5.3 Next.js API Routes

#### `/api/integrations/google/callback`
OAuth callback handler for Google Calendar. Receives authorization code, calls `calendar-oauth-callback` Edge Function or handles directly.

#### `/api/integrations/outlook/callback`
OAuth callback handler for Outlook Calendar.

#### `/api/integrations/hubspot/callback`
OAuth callback handler for HubSpot.

#### `/api/calendar/events`
Proxies requests to `fetch-external-calendar-events` Edge Function. Provides server-side auth context.

---

## 6. UI Changes

### 6.1 Settings → Integrations Redesign

**Layout:** Two tabs — "Calendar" and "CRM"

#### Calendar Tab
- **"Connect Google Calendar" button** (or "Connect Outlook Calendar")
- Connected accounts listed below, each showing:
  - Provider icon + account email
  - "Connected" status badge
  - "Disconnect" button (with warn-and-block logic)
  - List of calendars under this account (fetched from provider):
    - Calendar name + color swatch
    - "Used by: Campaign A, Campaign B" (if assigned to any campaigns)
- Note: Calendar display toggles (pull/none) are configured on the Calendar page, not here

#### CRM Tab
- If no CRM connected:
  - "Connect HubSpot" button (primary)
  - "Salesforce — Coming Soon" (grayed)
  - "GoHighLevel — Coming Soon" (grayed)
- If CRM connected:
  - Provider icon + "Connected" badge + account info
  - "Disconnect" button
  - **Activity Sync Toggles:**
    - ☑ Calls → Push call summaries to HubSpot
    - ☑ SMS Sent → Push outbound SMS to HubSpot
    - ☑ SMS Received → Push inbound SMS to HubSpot
    - ☑ Emails Sent → Push emails to HubSpot
    - ☑ Appointments Booked → Push bookings to HubSpot
  - Status badge: "Connected" / "Needs Re-auth" / "Error"

### 6.2 Campaign Wizard Amendments

**Step 2 (Add Leads) — New "Import from CRM" option:**
- Appears as a third tab alongside "Upload CSV" and "Existing Contacts"
- Only visible if a CRM is connected
- Clicking launches the CRM import wizard (Section 3.3) inline within the campaign wizard
- Imported contacts are automatically added as leads to this campaign

**Step 3 (Schedule) — New sections:**

**"Appointment Calendar" section:**
- Dropdown: "Courtside Calendar" (default) + all connected external calendars
- Help text: "Select which calendar to check for availability and book appointments to"

**"Appointment Availability" section:**
- Per-day toggle + time slot configuration (same UI pattern as the calling schedule above it)
- Defaults to Mon–Fri, 9 AM – 5 PM
- Help text: "Set the hours when the AI can offer appointment slots to leads"

### 6.3 Calendar Page Amendments

**New sidebar/panel (left or right) — Calendar Source List:**
- "Courtside Appointments" — always listed, always enabled, with emerald color swatch
- Each connected calendar that has `is_enabled_for_display: true`:
  - Checkbox toggle (on/off for display)
  - Calendar name + provider icon + color swatch
  - Setting: "Pull events to display" (toggle)
- "Time Blocks" — listed with gray color swatch, toggleable
- "Manage Calendars" link → navigates to Settings → Integrations

**New actions on calendar grid:**
- Click on empty time slot → context menu: "New Appointment" or "Block Time"
- "New Appointment" modal:
  - Date/time (pre-filled from clicked slot)
  - Duration (default 30 min)
  - Contact (optional — searchable dropdown)
  - Title (auto-generated if contact selected: "{Name} — Appointment")
  - Notes
  - Push to calendar (dropdown: "None" + connected calendars)
  - Save button
- "Block Time" modal:
  - Date/time (pre-filled)
  - Duration
  - Title
  - Save button

**External events display:**
- External events rendered as slightly transparent pills on the calendar grid
- Different border style or small icon to distinguish from Courtside appointments
- On click: minimal detail panel (title, time, source calendar name). No edit actions.
- Labeled: "{event_title}" (no campaign badge, since these aren't Courtside events)

### 6.4 Leads Page Amendments

**New "Source" column or badge on lead rows:**
- Shows: "CSV", "CRM" (with provider icon), "Manual", "Inbound"
- CRM badge is clickable → opens CRM record in new tab (deep link)

**Import button dropdown now includes:**
- "Upload CSV" (existing)
- "Import from CRM" (only if CRM connected) → launches CRM import wizard

**New filter option:**
- "Source" filter: All, CSV Import, CRM Import, Manual, Inbound Call

### 6.5 Lead Detail Amendments

**If the contact has a `crm_record_id`:**
- Show "View in HubSpot" (or relevant CRM) button/link in the contact card
- Badge showing CRM source

---

## 7. Implementation Plan — Phase 11

Phase 11 is a dedicated integration phase. It depends on Phase 1 (DB schema), Phase 2 (Auth), and Phase 3 (App shell) being complete. Frontend integration pages can be built with mock data in parallel with backend work. The phase is split into sub-phases by dependency.

### Phase 11.0: Database Migration [SEQUENTIAL — BLOCKER]
*All integration work depends on these schema changes.*

**Tasks:**
- Migration: Create `calendar_connections` table
- Migration: Create `campaign_appointment_schedules` table
- Migration: Create `calendar_blocks` table
- Migration: Create `crm_activity_log` table
- Migration: Add `crm_provider`, `crm_record_id` columns to `contacts`
- Migration: Add `calendar_connection_id` column to `campaigns`
- Migration: Add `calendar_connection_id`, `sync_status`, `is_manual`, `title` columns to `appointments`
- Migration: Add `account_email`, `service_type` columns to `integrations`
- Migration: Add `import_source` column to `leads`
- Migration: Create new enum types
- Migration: RLS policies for all new tables
- Migration: Indexes on new FK columns and common query patterns
- Regenerate TypeScript types

**Estimated complexity:** L (Large)

### Phase 11.1: OAuth Infrastructure [SEQUENTIAL]
*Must complete before any calendar or CRM feature works.*

**Tasks:**
- Create Google OAuth configuration (client ID, secret, redirect URI, scopes)
- Create Microsoft OAuth configuration
- Create HubSpot OAuth configuration
- Build Next.js API route: `/api/integrations/google/callback`
- Build Next.js API route: `/api/integrations/outlook/callback`
- Build Next.js API route: `/api/integrations/hubspot/callback`
- Build Edge Function: `calendar-oauth-callback` (exchange code, fetch calendars, create DB rows)
- Build Edge Function: `crm-oauth-callback` (exchange code, store tokens)
- Build token refresh utility (shared by all providers)
- Test OAuth flow end-to-end for all three providers

**Estimated complexity:** XL (Very Large)
**External gate:** Requires Google Cloud Console, Azure App Registration, and HubSpot App configuration.

### Phase 11.2: Calendar Backend [PARALLEL with 11.3]
*Calendar-specific backend services.*

**Tasks:**
- Update `check-availability` Edge Function:
  - Support Courtside Calendar mode (query appointments table)
  - Support external calendar mode (query Google/Outlook API)
  - Implement business hours intersection logic
  - Handle token refresh within the function
  - Test with both Google and Outlook calendars
- Update `sync-appointment-to-calendar` Edge Function:
  - Create events on Google Calendar via API
  - Create events on Outlook Calendar via Microsoft Graph
  - Update events when appointments are rescheduled
  - Delete events when appointments are cancelled
  - Handle sync failures (retry logic, status tracking)
  - Use hardcoded V1 event template
- Build `fetch-external-calendar-events` Edge Function:
  - Fetch events for a date range from Google/Outlook
  - Format events for frontend display
  - Handle token refresh
- Build `/api/calendar/events` Next.js API route (proxy with auth)
- Set up DB triggers on `appointments` table for sync
- Test full calendar flow: book → sync → reschedule → sync → cancel → sync

**Estimated complexity:** XL (Very Large)

### Phase 11.3: CRM Backend [PARALLEL with 11.2]
*CRM-specific backend services.*

**Tasks:**
- Build `crm-import-contacts` Edge Function:
  - Fetch contacts from HubSpot (lists and all-contacts endpoints)
  - Paginate through large result sets
  - Map HubSpot fields → Courtside fields
  - Upsert contacts (handle duplicates by phone)
  - Set `crm_provider` and `crm_record_id` on contacts
  - Create leads if campaign_id provided
  - Return import results summary
  - Respect HubSpot rate limits
- Build `crm-push-activity` Edge Function:
  - Create HubSpot Call engagements
  - Create HubSpot Email engagements
  - Create HubSpot Note engagements (for SMS)
  - Create HubSpot Meeting engagements (for appointments)
  - Associate engagements with contact
  - Log results to `crm_activity_log`
- Set up DB triggers for activity pushback:
  - Trigger on `calls` INSERT → push call activity
  - Trigger on `sms_messages` INSERT → push SMS activity
  - Trigger on `emails` INSERT → push email activity
  - Trigger on `appointments` INSERT → push appointment activity
  - Each trigger checks: contact has crm_record_id, CRM connected, toggle enabled
- Test import flow with HubSpot sandbox
- Test activity pushback for each activity type

**Estimated complexity:** XL (Very Large)

### Phase 11.4: Settings → Integrations UI [PARALLEL with 11.2, 11.3]
*Frontend for the integration settings page.*

**Tasks:**
- Redesign Settings → Integrations page:
  - Tab layout: Calendar | CRM
  - Calendar tab: connect buttons, connected account list, calendar list, disconnect flow
  - CRM tab: connect button, connected state, activity sync toggles, disconnect flow
- Build OAuth popup flow (open popup, handle message from callback, refresh page)
- Build calendar account connection UI (list calendars, show usage)
- Build CRM connection UI (status, toggles)
- Build disconnection confirmation modals (with warn-and-block for calendars)
- Wire to backend (OAuth routes, Edge Functions)

**Estimated complexity:** L (Large)

### Phase 11.5: Campaign Wizard Amendments [PARALLEL with 11.4]
*Add calendar and CRM features to the campaign wizard.*

**Tasks:**
- Step 2: Add "Import from CRM" tab (conditional on CRM connected)
- Step 2: Build inline CRM import wizard (4-step flow within the campaign wizard)
- Step 3: Add "Appointment Calendar" dropdown (Courtside + connected calendars)
- Step 3: Add "Appointment Availability" schedule section (per-day slots)
- Wire campaign creation to store `calendar_connection_id`
- Wire campaign creation to store `campaign_appointment_schedules`
- Test full wizard flow with calendar and CRM options

**Estimated complexity:** L (Large)

### Phase 11.6: Calendar Page Amendments [PARALLEL with 11.4]
*Add external event display, manual appointments, and time blocks to the calendar page.*

**Tasks:**
- Build calendar source sidebar (connected calendars, toggle display)
- Build external event fetching (call Edge Function on page load / month change)
- Render external events on calendar grid (distinct visual treatment)
- Build "New Appointment" modal (with optional contact link and calendar push dropdown)
- Build "Block Time" modal
- Build external event detail panel (read-only)
- Handle calendar source colors and visual differentiation
- Test with multiple calendars from different providers

**Estimated complexity:** L (Large)

### Phase 11.7: Leads Page & Lead Detail Amendments [PARALLEL with 11.4]
*Add CRM source indicators and import entry point.*

**Tasks:**
- Add source badge to lead rows (CSV, CRM, Manual, Inbound)
- Add "Import from CRM" to the Import button dropdown
- Build standalone CRM import wizard (accessed from Leads page)
- Add "Source" filter option to leads page filters
- Add "View in HubSpot" link to lead detail contact card (when crm_record_id exists)
- Add CRM source badge to lead detail header

**Estimated complexity:** M (Medium)

### Phase 11.8: Integration Testing [SEQUENTIAL]
*End-to-end testing of all integration flows.*

**Tasks:**
- Test: Connect Google Calendar → select calendar for campaign → run campaign → AI checks availability → books appointment → event appears on Google Calendar + Courtside calendar page
- Test: Connect Outlook Calendar → same flow
- Test: Calendar page displays external events from multiple calendars
- Test: Manual appointment created → pushed to selected external calendar
- Test: Disconnect calendar with active campaigns → blocked with warning
- Test: Token expiry → silent refresh
- Test: Token revocation → "needs reauth" state
- Test: Connect HubSpot → import contacts from list → contacts appear in Courtside with CRM badges
- Test: Campaign with CRM-imported leads → call completed → activity appears in HubSpot timeline
- Test: SMS sent to CRM contact → note appears in HubSpot
- Test: Disconnect CRM → CRM fields cleared → activity pushback stops
- Test: Calendar sync failure → appointment still created in Courtside → retry succeeds later

**Estimated complexity:** L (Large)

### Phase Summary & Dependencies

```
Phase 11.0: DB Migration ──────────────── [MUST BE FIRST]
    │
Phase 11.1: OAuth Infrastructure ──────── [MUST BE SECOND]
    │
    ├───────────────────────────────────────────────────┐
    │                                                   │
Phase 11.2: Calendar Backend [PARALLEL]   Phase 11.3: CRM Backend [PARALLEL]
    │                                                   │
    ├───────────────────────────────────────────────────┤
    │                                                   │
Phase 11.4: Settings UI [PARALLEL]                      │
Phase 11.5: Campaign Wizard [PARALLEL]                  │
Phase 11.6: Calendar Page [PARALLEL]                    │
Phase 11.7: Leads Page [PARALLEL]                       │
    │                                                   │
    └───────────────────────┬───────────────────────────┘
                            │
Phase 11.8: Integration Testing ────────── [LAST]
```

**Total estimated effort:** ~6-8 weeks with 2-3 parallel workstreams.

---

## 8. Rules & Constraints

These are the hard rules that all implementation must follow:

### Calendar Rules

1. **Every appointment always exists in Courtside DB first.** External calendar sync is secondary. A sync failure never prevents appointment creation.
2. **Availability is checked against ONE source only** — either the campaign's assigned external calendar OR the Courtside appointments table. Never both, never multiple calendars.
3. **Business hours are enforced on top of calendar availability.** A slot must be both free on the calendar AND within the campaign's appointment availability hours to be offered.
4. **External events on the calendar page are read-only.** Users cannot edit, move, or delete external calendar events from Courtside.
5. **External events are fetched live, not cached.** The calendar page fetches events from the provider API on each page load. No background sync jobs for display events.
6. **Calendar disconnection is blocked if active campaigns depend on it.** User must reassign campaigns first.
7. **Manual time blocks are cosmetic only.** They do not affect campaign availability checking. They are not synced to external calendars.
8. **Manual appointments can optionally push to an external calendar.** The user selects the target calendar during creation.
9. **Campaign appointment availability hours are separate from calling hours.** A campaign has two independent schedules.
10. **Token refresh is silent.** Users are only notified when refresh fails (token revoked). Campaigns continue with Courtside-only mode if token refresh fails.

### CRM Rules

1. **One CRM connection per org.** Switching CRMs requires disconnecting first, which clears all CRM record IDs.
2. **Activity pushback is only for CRM-imported contacts.** Contacts imported via CSV or created manually do not get CRM pushback, even if they exist in the CRM.
3. **Activity pushback is real-time.** Each activity triggers an immediate push attempt.
4. **Activity pushback is per-type configurable.** Each activity type (calls, SMS sent, SMS received, emails, appointments) has an independent toggle.
5. **CRM import is always manual (one-time).** No ongoing auto-sync. User triggers each import explicitly.
6. **Duplicate contacts are updated, not skipped.** When importing, if a phone number already exists in Courtside, the contact record is updated with CRM data.
7. **CRM import can happen from two places:** Campaign wizard Step 2 and Leads page Import button. Same wizard, different entry points.
8. **Field mapping is automatic for V1.** Standard fields are mapped automatically. Custom field mapping is a future enhancement.
9. **We push activities, not status changes.** Lead status changes, appointment outcomes (showed/no-show), and action items are NOT pushed to the CRM.
10. **CRM record IDs are cleared on disconnect.** No stale references from a previous CRM. Clean break.

### Shared Rules

1. **OAuth tokens must be stored securely.** Use Supabase Vault or encrypted JSONB columns. Never expose tokens to the frontend.
2. **All integration tables use org_id RLS.** Standard tenant isolation applies to all new tables.
3. **Integrations fail gracefully.** No external API failure should break core Courtside functionality.
4. **The Settings → Integrations page is for establishing connections.** Calendar display configuration lives on the Calendar page. CRM import lives in the Campaign wizard or Leads page. Activity pushback toggles are the one exception (Settings page makes sense for global toggles).

---

*Last updated: February 2026*
