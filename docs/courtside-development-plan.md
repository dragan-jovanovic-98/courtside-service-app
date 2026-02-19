# Courtside AI — Development Plan

> This document maps the entire build process for Courtside AI, from empty folder to production-ready application. Each phase specifies which tasks are **sequential** (must complete before the next starts) and which can run **in parallel** (independent Claude Code sub-agents). The plan references the data model document and the JSX prototype as sources of truth.

---

## How to Read This Plan

- **→ SEQUENTIAL** = Must complete in order. Next task depends on output of previous.
- **‖ PARALLEL** = Independent tasks that can be built simultaneously by sub-agents.
- **[BLOCKER]** = Nothing after this point can start until this completes.
- **[GATE]** = Requires manual action or external setup before continuing.
- Each task includes an estimated complexity: **S** (small, <1hr), **M** (medium, 1-3hr), **L** (large, 3-8hr), **XL** (very large, 8hr+).

---

## Phase 0: Project Scaffolding [BLOCKER]
*Everything depends on this. Must complete first.*

### → 0.1 Create Project Folder & Initialize Next.js (S)
```
courtside-ai/                    ← subfolder inside workspace
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/
├── public/
├── .env.local.example
├── CLAUDE.md
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Tasks:**
- `npx create-next-app@latest courtside-ai --typescript --tailwind --eslint --app --src-dir`
- Install core dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `lucide-react`
- Install shadcn/ui: `npx shadcn@latest init` + install all needed components
- Copy CLAUDE.md into project root (updated with project-specific instructions)
- Set up `.env.local.example` with all required env var placeholders
- Configure `tsconfig.json` strict mode, path aliases (`@/`)
- Set up Tailwind config with dark theme as default, custom colors matching design tokens

**Output:** Empty but runnable Next.js project with all dependencies installed.

### → 0.2 Supabase Project Setup [GATE] (S)
*Requires: Supabase project exists (already created or create now)*

**Tasks:**
- Confirm Supabase project ID and credentials
- Set up Supabase client utilities:
  - `src/lib/supabase/client.ts` — browser client
  - `src/lib/supabase/server.ts` — server component client
  - `src/lib/supabase/middleware.ts` — auth middleware
- Create `src/middleware.ts` for auth route protection
- Add actual env vars to `.env.local`

**Output:** Supabase connected, auth middleware in place, clients ready.

### → 0.3 Design System Foundation (M)
*Can start once 0.1 completes. Runs alongside 0.2.*

**Tasks:**
- Create `src/lib/design-tokens.ts` — port design tokens from prototype `T` object to Tailwind-compatible values
- Configure Tailwind `theme.extend` with all custom colors, spacing, border radiuses from prototype
- Create base UI primitives that wrap shadcn/ui to match dark theme:
  - `src/components/ui/card.tsx` — dark card with hover state
  - `src/components/ui/badge.tsx` — colored badge variants (emerald, amber, blue, red, purple, default)
  - `src/components/ui/button.tsx` — primary (emerald) and ghost variants
  - `src/components/ui/progress-bar.tsx` — thin progress bar
  - `src/components/ui/section-label.tsx` — uppercase section labels
  - `src/components/ui/stat-card.tsx` — metric card with icon + accent
  - `src/components/ui/dropdown-select.tsx` — filter dropdown (port from prototype)
  - `src/components/ui/action-dropdown.tsx` — action menu dropdown
  - `src/components/ui/data-table.tsx` — reusable table with hover rows
  - `src/components/ui/toggle-switch.tsx` — settings toggle
  - `src/components/ui/input.tsx` — dark input fields
  - `src/components/ui/modal.tsx` — dark modal/dialog
- Load Google Fonts (Inter for UI, Lora for brand mark)
- Set global styles: dark background `#0e1117`, Inter font family

**Output:** Complete component library matching prototype aesthetic. All subsequent UI work uses these primitives.

---

## Phase 1: Database Schema [BLOCKER]
*Must complete before any data-dependent frontend or backend work.*

### → 1.1 Core Tables Migration (L)
*Reference: Data Model sections 4.1–4.10*

Create Supabase migration file(s) for the foundational tables in dependency order:

```sql
-- Migration 001: Core schema
1. organizations
2. users (FK → organizations)
3. contacts (FK → organizations)
4. campaigns (FK → organizations)
5. agents (FK → organizations)
6. leads (FK → contacts, campaigns, organizations)
7. campaign_schedules (FK → campaigns)
8. calls (FK → leads, contacts, agents, campaigns, organizations)
9. appointments (FK → leads, contacts, campaigns, calls, organizations)
10. action_items (FK → contacts, leads, calls, organizations)
```

**Includes:**
- All columns, types, constraints, defaults from data model
- All enum types (lead_status, call_outcome, campaign_status, etc.)
- Foreign key constraints with appropriate ON DELETE behavior
- Unique constraints (contacts: org_id+phone, leads: contact_id+campaign_id, etc.)
- Timestamp defaults (`now()`)

### → 1.2 Supporting Tables Migration (M)
*Reference: Data Model sections 4.11–4.22*

```sql
-- Migration 002: Supporting tables
11. phone_numbers
12. dnc_list
13. subscriptions
14. invoices
15. verification
16. compliance_settings
17. notification_preferences
18. integrations
19. sms_messages
20. emails
21. notifications
22. workflow_events
```

### → 1.3 Indexes Migration (S)
*Reference: Data Model Appendix*

```sql
-- Migration 003: Performance indexes
-- All indexes from the Appendix section
```

### → 1.4 RLS Policies Migration (M)
*Reference: Data Model section 11*

```sql
-- Migration 004: Row Level Security
-- Enable RLS on all tables
-- Create org-based isolation policies
-- Special policies for users, notification_preferences, workflow_events
```

### → 1.5 Generate TypeScript Types (S)
*After all migrations applied*

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

Create helper types:
- `src/types/index.ts` — re-export + custom derived types (e.g., `LeadWithContact`, `CallWithAgent`)

**Output:** Complete database schema, RLS enabled, TypeScript types generated. Everything downstream can now reference real types.

---

## Phase 2: Auth Flow [BLOCKER for protected pages]
*Must complete before any authenticated page can work.*

### → 2.1 Auth Pages & Logic (M)

**Tasks:**
- `src/app/(auth)/login/page.tsx` — email/password login form
- `src/app/(auth)/signup/page.tsx` — registration with org creation
- `src/app/(auth)/magic-link/page.tsx` — magic link request
- `src/app/(auth)/auth/callback/route.ts` — auth callback handler
- `src/lib/supabase/auth.ts` — auth helper functions (signIn, signUp, signOut, getUser)
- Middleware route protection: redirect unauthenticated users to `/login`
- Post-signup flow: create `organizations` record + `users` record with `owner` role

**Output:** Working auth flow. Users can sign up (creates org + user), log in, and access protected routes.

---

## Phase 3: App Shell & Layout [BLOCKER for page content]
*Must complete before individual page work.*

### → 3.1 Dashboard Layout (M)

**Tasks:**
- `src/app/(dashboard)/layout.tsx` — the authenticated layout wrapper
- `src/components/layout/sidebar.tsx` — port sidebar from prototype:
  - Lora font brand mark "Courtside AI" with logo SVG
  - Nav items: Home, Campaigns, Leads, Calls, Calendar
  - Settings link at bottom
  - User avatar + name + plan badge
  - Active state highlighting (emerald)
  - Action item count badge on Home
- `src/components/layout/header.tsx` — optional top bar (notification bell)
- Route structure:
  ```
  src/app/(dashboard)/
  ├── layout.tsx
  ├── page.tsx              → redirects to /dashboard
  ├── dashboard/page.tsx    → Home
  ├── campaigns/
  │   ├── page.tsx          → Campaign list
  │   └── new/page.tsx      → New campaign wizard
  ├── leads/page.tsx        → Leads list + detail
  ├── calls/page.tsx        → Calls list + detail
  ├── calendar/page.tsx     → Calendar view
  └── settings/
      ├── page.tsx          → redirects to /settings/profile
      ├── profile/page.tsx
      ├── billing/page.tsx
      ├── organization/page.tsx
      ├── team/page.tsx
      ├── agents/
      │   ├── page.tsx
      │   └── new/page.tsx
      ├── verification/page.tsx
      ├── integrations/page.tsx
      └── compliance/page.tsx
  ```

**Output:** Navigable app shell. All routes exist as empty pages with sidebar navigation working. Clicking around works but pages show placeholder content.

---

## Phase 4: Core Pages — Frontend [PARALLEL]
*These pages can all be built simultaneously by independent sub-agents.*
*Each sub-agent needs: design system components, TypeScript types, Supabase client.*
*Initially built with mock data, then wired to real Supabase queries.*

### ‖ 4.1 Home Page / Dashboard (XL)
*Reference: Prototype `HomePage` component, Data Model Section 5 "Home Page"*

**Sub-tasks:**
- Greeting header with user name + date
- "New Campaign" button
- **Action Zone:**
  - Today's Appointments card (read from `appointments` + `contacts`)
  - Action Items card (read from `action_items` + `contacts`)
    - Follow Up dropdown (Call Now, Send Text, Schedule Callback, Send Email)
    - Resolve dropdown (Appointment Scheduled, Follow-up Scheduled, Not Interested, Wrong Number, Dismiss)
    - Date/time modal for scheduling
    - Resolved state with undo
- **Results section:**
  - Time range toggle (Today, 7d, 30d, All)
  - 4 metric cards (Appointments, Est. Revenue, Hours Saved, Active Pipeline)
  - Engaged Leads breakdown card
  - Call Outcomes horizontal bar chart
  - Conversion Funnel visualization
- **Active Campaigns** cards (3-column grid)

**Data queries:**
- `appointments` (today, with contact + campaign joins)
- `action_items` (unresolved, ordered by created_at DESC)
- `calls` (aggregated by outcome, date range filtered)
- `leads` (aggregated by status)
- `campaigns` (active + paused, with stats)

### ‖ 4.2 Campaigns Page (L)
*Reference: Prototype `CampaignsPage` + `NewCampaign` components*

**Sub-tasks:**
- Stats bar (Total, Active, Total Leads, Bookings)
- Status filter tabs (all, active, paused, draft, completed)
- Campaign cards with:
  - Progress bar (calls made / total leads)
  - Booking count highlight
  - Connected, Duration, Remaining stats
  - Pause/Resume/Add Leads buttons
- **New Campaign Wizard** (4-step form):
  - Step 1: Select Agent (read from `agents`)
  - Step 2: Name + Add Leads (CSV upload + existing contacts)
  - Step 3: Schedule (per-day time slots) + Rules (daily limit, retries, timezone, end date)
  - Step 4: Review & Launch (summary + Save Draft / Save & Activate)

**Data queries:**
- `campaigns` (with denormalized stats)
- `agents` (for wizard step 1)
- `contacts` (for existing lead selection in step 2)

**Write operations:**
- Create campaign + campaign_schedules
- Import leads (upsert contacts, create leads, DNC check)
- Update campaign status (pause/resume)

### ‖ 4.3 Leads Page (L)
*Reference: Prototype `LeadsPage` component*

**Sub-tasks:**
- Stats bar (Total, Follow-ups, Appointments, New)
- Search bar + Status/Outcome filter dropdowns
- Leads table (Name/Company, Phone, Status badge, Outcome badge, Last Activity, Campaign)
- Import button + Add Lead button
- **Lead Detail View** (slide-in or dedicated route):
  - Contact card (phone, email, company)
  - Status management card:
    - Current status badge
    - Contextual suggested action buttons based on status
    - Manual override dropdown with all statuses
  - Action buttons (Call Now, Text, Email)
  - Timeline (calls, SMS, emails — chronological)

**Data queries:**
- `leads` JOIN `contacts` (filtered, paginated)
- `calls` + `sms_messages` + `emails` (for timeline, filtered by contact_id)

**Write operations:**
- Update lead status
- Initiate call / send SMS / send email (via Edge Functions)

### ‖ 4.4 Calls Page (L)
*Reference: Prototype `CallsPage` component*

**Sub-tasks:**
- Stats bar (Total Calls, Today, Connected, Booked)
- Search + Direction/Outcome/Campaign filter dropdowns
- Calls table (Direction icon, Date, Lead, Phone, Agent, Duration, Outcome badge, Campaign)
- **Call Detail View:**
  - 5-stat header row (Date, Phone, Duration, Agent, Campaign)
  - AI Summary card
  - Recording player (play button, progress bar, timestamps)
  - Transcript card (speaker-labeled turns)
  - "Call Again" (primary) + "View Lead" buttons

**Data queries:**
- `calls` JOIN `agents` (filtered, paginated)
- Single call with full metadata for detail view

### ‖ 4.5 Calendar Page (L)
*Reference: Prototype `CalendarPage` component*

**Sub-tasks:**
- Stats bar (Today, This Week, This Month, Show Rate Past 30d)
- Campaign color legend
- Monthly calendar grid (28-day February layout, generalizable)
  - Appointment pills with campaign color + time + name
  - Click to open detail panel
- Upcoming This Week list (below calendar)
- **Appointment Detail Panel** (slide-out right panel):
  - Contact name + company
  - Time + date + AI call duration
  - Phone number + campaign
  - AI Call Summary
  - Action buttons: Call Now, Reschedule, Cancel

**Data queries:**
- `appointments` JOIN `contacts` JOIN `campaigns` (month range)
- Aggregations for stats bar

**Write operations:**
- Reschedule appointment (update `scheduled_at`)
- Cancel appointment (update `status`)

---

## Phase 5: Settings Pages — Frontend [PARALLEL]
*All settings sub-pages are independent and can be built simultaneously.*

### ‖ 5.1 Profile & Notifications (M)
- User info form (first/last name, email, phone, timezone)
- Avatar display with initials fallback
- Notification preferences grid (7 event types × 3 channels)
- Save buttons

**Data:** `users`, `notification_preferences`

### ‖ 5.2 Billing (M)
- Plan card with usage bars (AI call minutes, phone numbers)
- Cost breakdown stats (monthly cost, per extra min, saved vs. manual)
- Recent Invoices list
- Your Phone Numbers table (Number, Type, Assigned To, Texts, Calls, Status)
- Request Number button
- Stripe Billing Portal link

**Data:** `subscriptions`, `invoices`, `phone_numbers`

### ‖ 5.3 Organization (S)
- Org details form (name, industry, business type, phone, website, address)
- Save button

**Data:** `organizations`

### ‖ 5.4 Team Management (M)
- Team member list (avatar, name, email, role badge, status badge)
- Invite Member button + form
- Remove member (with confirmation)
- Role management (owner/admin/member)

**Data:** `users` (same org)

### ‖ 5.5 Agents (M)
- Agent list with stats (calls, booking rate, campaigns, direction badge)
- Inbound agents show dedicated phone number
- Pending agents show setup banner
- **Request New Agent form:**
  - Agent Name, Type (select), Voice (Female/Male)
  - Purpose & Description (textarea)
  - Campaign Goals (multi-select checkboxes)
  - Preferred Greeting, Additional Notes

**Data:** `agents`, `phone_numbers`

### ‖ 5.6 Verification (M)
- Status banner (not started / in progress / approved / rejected)
- 2-step form with progress indicator
- Step 1: Business Details with Canada/US country selector
  - Adaptive fields (BN vs EIN, Province vs State, etc.)
- Step 2: Authorized Representative

**Data:** `verification`

### ‖ 5.7 Integrations (S)
- Connected services list (Google Calendar available, others "Coming Soon")
- Connect button → OAuth flow (Google Calendar)
- Status badges

**Data:** `integrations`

### ‖ 5.8 Compliance (M)
- Compliance status banner
- Terms of Service (accepted status + view button)
- CASL Compliance toggle
- Verification checklist
- DNC Management (stats + upload CSV + add number)
- Auto Opt-Out Rules (4 toggles)

**Data:** `compliance_settings`, `dnc_list`

---

## Phase 6: Backend — Supabase Edge Functions [PARALLEL]
*These can be built in parallel once the database schema exists.*
*Each function is independent. Test with curl / Postman.*

### ‖ 6.1 Call Initiation (M)
- `supabase/functions/initiate-call/index.ts`
- Auth validation → look up agent's Retell ID → call Retell API to create call
- Store pending call record in `calls` table
- Used by: "Call Now" / "Call Again" buttons

### ‖ 6.2 SMS Sending (M)
- `supabase/functions/send-sms/index.ts`
- Auth validation → pick appropriate phone number → send via Twilio API
- Insert into `sms_messages` table
- Used by: "Text" button, automated confirmations

### ‖ 6.3 Lead Import (L)
- `supabase/functions/import-leads/index.ts`
- Auth validation → parse CSV → DNC check against `dnc_list` → upsert `contacts` → create `leads`
- Return: imported count, DNC excluded count, duplicate count
- Used by: Campaign wizard step 2, Leads page Import

### ‖ 6.4 Campaign Management (M)
- `supabase/functions/create-campaign/index.ts` — create campaign + schedules + validate agent
- `supabase/functions/update-campaign-status/index.ts` — pause/resume/complete
- Used by: Campaign wizard, campaign list actions

### ‖ 6.5 Lead Status Management (S)
- `supabase/functions/update-lead-status/index.ts`
- Validate transition, update status, create related records (e.g., if marking as "Appt Set", ensure appointment exists)
- Used by: Lead detail status buttons

### ‖ 6.6 Action Item Resolution (S)
- `supabase/functions/resolve-action-item/index.ts`
- Mark resolved, set resolution_type + detail + timestamp
- Used by: Home page Action Items

### ‖ 6.7 Appointment Management (M)
- `supabase/functions/create-appointment/index.ts`
- `supabase/functions/reschedule-appointment/index.ts`
- `supabase/functions/cancel-appointment/index.ts`
- Each triggers N8N webhook for calendar sync + lead notifications
- Used by: Action item resolution, calendar panel

### ‖ 6.8 Calendar Availability Check (L)
- `supabase/functions/check-availability/index.ts`
- Read Google/Outlook Calendar API + check `appointments` table
- Return available time slots as JSON
- Called by Retell during live calls (needs to be fast, <2s)
- Used by: Retell agent mid-call

### ‖ 6.9 Dashboard Stats (M)
- `supabase/functions/dashboard-stats/index.ts`
- Aggregated queries for all dashboard metrics (appointments, revenue, pipeline, outcomes, funnel)
- Date-range filtered
- Used by: Home page

### ‖ 6.10 Stripe Billing Portal (S)
- `supabase/functions/stripe-portal-url/index.ts`
- Create Stripe Billing Portal session → return URL
- Used by: Billing settings "Open Stripe Billing Portal"

### ‖ 6.11 Notifications (S)
- `supabase/functions/get-notifications/index.ts`
- `supabase/functions/mark-notifications-read/index.ts`
- Used by: Notification bell in header

### ‖ 6.12 Verification & Agent Requests (S)
- `supabase/functions/submit-verification/index.ts`
- `supabase/functions/submit-agent-request/index.ts`
- Used by: Settings forms

---

## Phase 7: Backend — Webhooks, Workflows & Notification System

*Revised Feb 2026. Workflows are split across N8N (scheduling, complex branching), Next.js API routes (simple webhook→DB), and Edge Functions (auth-gated logic, calendar). This phase depends on the database schema but NOT on the frontend.*

### Build Approach

**N8N workflows (7.1, 7.4, 7.6):** Each workflow is documented as a detailed markdown blueprint with:
- Step-by-step node configuration (node type, parameters, connections)
- Code snippets for Code nodes (JavaScript)
- JSON body templates for HTTP Request nodes
- curl commands for testing each node independently
- Connection diagrams showing the flow

These blueprints are built **manually in the n8n visual editor**, not created via API/MCP. This avoids credential-linking issues and makes it easier to test, debug, and iterate.

**Next.js API routes (7.2, 7.3):** Built as code in the codebase, committed to git.

**Edge Functions (7.0, 7.5):** Built as Supabase Edge Functions in `supabase/functions/`, committed to git.

### Technology Split

| Workflow | Runtime | Rationale |
|---|---|---|
| 7.0 Notification Delivery | Edge Function + DB trigger | Shared by all workflows, no duplication |
| 7.1 Retell Post-Call Webhook | N8N | Complex branching (8 outcomes), AI analysis node, visual debugging |
| 7.2 Twilio SMS Webhook | Next.js API route | Simple linear flow, Twilio signature verification |
| 7.3 Stripe Webhook | Next.js API route | Standard pattern, `constructEvent()` verification |
| 7.4 Campaign Processor | N8N | Scheduled job + loop + external API calls |
| 7.5 Calendar Sync | Edge Function + DB trigger | OAuth token management, Google/Outlook SDKs. **Prep only for now — full integration deferred.** |
| 7.6 Appointment Reminders | N8N | Scheduled cron + SMS/email |

### Schema Changes Required (Migration)

Before building Phase 7 workflows:
- Add `stripe_customer_id` (text, nullable) to `organizations` table
- Add DB trigger on `notifications` table → calls `deliver-notification` Edge Function
- Add DB trigger on `appointments` table → calls `sync-appointment-to-calendar` Edge Function (stub)
- Verify `integrations.config` JSONB supports `access_token`, `refresh_token`, `calendar_id`, `token_expires_at`, `provider`

---

### → 7.0 Notification Delivery System [BUILD FIRST — other workflows depend on this]

*Shared notification infrastructure. Every workflow just INSERTs into `notifications` table; delivery is automatic.*

**Architecture:**
```
Any workflow → INSERT INTO notifications (type, title, body, user_id, reference_type, reference_id)
  → DB trigger fires on INSERT
  → Calls `deliver-notification` Edge Function
  → Edge Function:
      1. Read notification_preferences for this user + event type
      2. In-app: already done (the row exists, bell icon reads it)
      3. Email (if enabled): send via Resend
      4. SMS to broker (if enabled): send via Twilio to users.phone
```

**Edge Function:** `supabase/functions/deliver-notification/index.ts`

**Inputs:** The newly inserted `notifications` row (passed by DB trigger)

**Logic:**
1. Query `notification_preferences` for `user_id` + `type` mapping
2. If email enabled → Resend API with notification title/body
3. If SMS enabled → Twilio API to broker's phone number from `users.phone`
4. Update `notifications` row with delivery metadata (optional, for debugging)

**Dependencies:** Resend API key, Twilio credentials (already configured for SMS sending)

---

### → 7.1 Retell Post-Call Webhook (XL) — N8N

*The most critical workflow. Outbound campaign calls only (for now). Inbound handling deferred.*

**Trigger:** Retell sends webhook when call ends (`call_analyzed` event)

**What Retell sends:** Raw transcript, recording URL, start/end timestamps, duration, agent_id, call_id, user sentiment, latency, cost, and dynamic variables. The `metadata` field contains `contact_id`, `campaign_id`, `org_id` (passed by Campaign Processor when initiating the call). **Retell does NOT send structured call analysis — we do that ourselves with an AI node.**

**Flow:**
```
Retell webhook POST → N8N
  1. Receive payload (transcript, recording, timestamps, metadata)
  2. AI Node: Analyze transcript → structured JSON:
     - outcome (booked/interested/callback/voicemail/no_answer/not_interested/wrong_number/dnc)
     - outcome_confidence, outcome_reasoning
     - appointment details (if booked): date, time, timezone, duration
     - callback details (if callback): requested date/time
     - summary + summary_one_line
     - sentiment, engagement_level
     - financial_details (industry-specific extraction)
     - objections (with handling notes)
     - follow_up (recommended action, unanswered questions, urgency)
     - compliance flags (dnc_requested, profanity, recording_consent)
  3. Insert into `calls` table:
     - retell_call_id, org_id, lead_id, contact_id, agent_id, campaign_id (from metadata)
     - direction: "outbound"
     - caller_phone, callee_phone, started_at, ended_at, duration_seconds
     - recording_url, transcript_text (from Retell)
     - outcome, ai_summary, summary_one_line, sentiment, engagement_level, outcome_confidence (from AI)
     - metadata JSONB: full AI analysis (financial_details, objections, topics, follow_up, compliance)
  4. Update lead: status + last_call_outcome (using metadata.lead_id)
  5. Update campaign denormalized stats (calls_made, calls_connected, bookings)
  6. Update agent denormalized stats (total_calls, total_bookings, booking_rate)
  7. Log workflow_events entry
  8. BRANCH by AI-determined outcome:

     BOOKED:
       → Insert into `appointments` (scheduled_at from AI, link to lead/contact/campaign/call)
         (Calendar sync fires automatically via DB trigger — this workflow does NOT call it)
       → Send confirmation SMS to lead via Twilio
       → Send confirmation email to lead via Resend (if contact has email)
       → INSERT INTO notifications (type: appointment_booked) → delivery handled by 7.0

     INTERESTED:
       → Create action_item (type: hot_lead, description includes AI summary)
       → INSERT INTO notifications (type: hot_lead_alert)

     CALLBACK:
       → Create action_item (type: callback_request, description: "Requested callback at [time]")
       → INSERT INTO notifications (type: callback_requested)

     VOICEMAIL:
       → Update lead: status → contacted, increment retry_count
       → (Campaign Processor handles retry scheduling automatically)

     NO_ANSWER:
       → Increment lead retry_count (keep status as-is)
       → (Campaign Processor handles retry)

     NOT_INTERESTED:
       → Update lead: status → contacted, last_call_outcome → not_interested
       → (Lead skipped in future campaign calls — Edge Function filters by outcome)

     WRONG_NUMBER:
       → Update lead: status → bad_lead

     DNC:
       → Update lead: status → bad_lead
       → Insert into dnc_list (reason: verbal_dnc, call_id reference)
       → Remove contact from all active campaigns (set other leads to bad_lead)
       → Log workflow_event: dnc_auto_added
```

**AI Node Configuration:** Uses structured output prompt tailored per agent type (mortgage, insurance, commercial lending). The `agents.agent_type` field determines which extraction prompt variant is used. See data model Section 7.2 for the full JSON schema and Section 7.6 for industry-specific focus areas.

---

### → 7.2 Twilio SMS Webhook (M) — Next.js API Route

*Simple inbound SMS handling. API route at `src/app/api/webhooks/twilio/route.ts`.*

**Trigger:** Twilio POST when an inbound SMS arrives on a dedicated org number.

**Flow:**
```
Twilio POST → /api/webhooks/twilio
  1. Verify Twilio request signature (security)
  2. Match org: to_number → phone_numbers table → org_id
  3. Match contact: from_number + org_id → contacts table
  4. Check for STOP/UNSUBSCRIBE keyword in body:
     YES:
       → Insert into dnc_list (reason: sms_stop, phone: from_number)
       → Set all active leads for this contact to bad_lead
       → Return TwiML opt-out confirmation response
     NO:
       → Insert into sms_messages (org_id, contact_id, direction: inbound, body, from_number, to_number)
       → Create action_item (type: sms_reply, title: "[Contact Name] replied via SMS", description: message body)
       → INSERT INTO notifications (type: sms_reply, reference_type: contact, reference_id: contact.id)
  5. Return TwiML response (empty — no auto-reply for now)
```

**Auth:** Twilio signature verification using `TWILIO_AUTH_TOKEN` (not Supabase auth — this is an external webhook).

**Dependencies:** `twilio` npm package for signature verification.

---

### → 7.3 Stripe Webhook (M) — Next.js API Route

*Billing event sync. API route at `src/app/api/webhooks/stripe/route.ts`.*

**Trigger:** Stripe POST on billing events.

**Flow:**
```
Stripe POST → /api/webhooks/stripe
  1. Verify signature: stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  2. Switch on event.type:

     checkout.session.completed:
       → Extract customer ID from session
       → Update organizations.stripe_customer_id (link Stripe to org)

     customer.subscription.created / updated / deleted:
       → Upsert subscriptions table (stripe_subscription_id, plan, status, current_period_start/end, usage limits)

     invoice.paid:
       → Upsert invoices table (stripe_invoice_id, amount, status: paid, pdf_url, period)

     invoice.payment_failed:
       → Upsert invoices table (status: failed)
       → INSERT INTO notifications (type: payment_failed) → triggers email to broker via 7.0

  3. Log workflow_events entry
  4. Return 200
```

**Auth:** Stripe signature verification using `STRIPE_WEBHOOK_SECRET`.

**Dependencies:** `stripe` npm package.

---

### → 7.4 Campaign Processor (L) — N8N — **DONE**

**Architecture:** Edge Function `get-next-campaign-leads` contains all business logic (schedule windows, daily limits, DNC filtering, retry intervals, org concurrency). N8N just orchestrates.

**Flow:**
```
Schedule Trigger (every 2 min)
  → POST to get-next-campaign-leads Edge Function
  → Flatten batches into individual leads (Code node)
  → Loop over leads (SplitInBatches):
      → POST to Retell API (create-phone-call) with metadata: {lead_id, campaign_id, org_id, contact_id}
        SUCCESS → Insert minimal call record in `calls` (for concurrency tracking)
                → Update lead (status: contacted, retry_count++, last_activity_at)
                → Wait 2s → next lead
        ERROR   → Update lead (retry_count++, last_activity_at) → Wait 2s → next lead
```

**Deliverable:** Detailed markdown blueprint in `docs/n8n-blueprints/campaign-processor.md` with node configs, code snippets, JSON body templates, and curl test commands. Build manually in n8n visual editor.

**Note:** A draft workflow was created via MCP (ID: `bIyP0QwEe37K6vCA`) but should be rebuilt manually using the blueprint for proper credential configuration and testing.

---

### → 7.5 Calendar Sync (M) — Edge Functions + DB Triggers — **PREP ONLY**

*Full Google/Outlook integration deferred to a separate phase. Build the architecture now.*

#### 7.5a `check-availability` Edge Function (Stub)

*Called by Retell agent mid-call to check broker's calendar.*

**Interface (design now, implement later):**
```
POST /functions/v1/check-availability
Body: { org_id, requested_datetime, timezone }

Response: {
  requested_slot_available: boolean,
  alternatives: [
    { datetime: "2026-02-19T10:30:00", available: true },
    { datetime: "2026-02-19T14:00:00", available: true },
    ...
  ]
}
```

**Logic (when implemented):**
- Takes a requested datetime, checks availability for that day +/- 1 day (48-72 hour window, excluding past dates)
- Reads org's calendar via Google Calendar API / Microsoft Graph (from `integrations` table credentials)
- Also checks `appointments` table for existing Courtside bookings
- Returns available/unavailable + alternative slots
- Must be fast (<2s) — called during live conversation
- Needs to be flexible with input queries (AI agent sends natural language converted to datetime)

**For now:** Create the Edge Function with the interface, return mock available slots. Wire to real calendar API in the integration phase.

#### 7.5b `sync-appointment-to-calendar` Edge Function + DB Trigger

*Fires automatically when appointments are created, updated, or deleted.*

**DB Trigger:** On `appointments` table INSERT/UPDATE/DELETE → calls Edge Function via `pg_net` or Supabase Database Webhook.

**Interface:**
```
Receives: { appointment row, operation: insert|update|delete }

Logic:
  1. Check if org has connected calendar (integrations table, provider: google|outlook)
  2. If no integration → skip silently
  3. Refresh OAuth token if expired
  4. Create/update/delete calendar event via Google Calendar API or Microsoft Graph
  5. Update appointments.calendar_event_id + calendar_synced_at
```

**For now:** Create the Edge Function stub + DB trigger. Function logs the event but does not call external APIs. Wire to real calendar API in the integration phase.

#### 7.5c Google & Outlook OAuth + Calendar API — **DEFERRED**

*Separate phase after core workflows are solid.*

- Google OAuth flow (connect button in Settings → Integrations)
- Outlook/Microsoft OAuth flow
- Token refresh logic
- Calendar API read/write implementation
- Testing with real calendars

---

### → 7.6 Appointment Reminders (S) — N8N

*Daily summary email deferred. Build appointment reminders only.*

**Trigger:** N8N cron, morning check

**Flow:**
```
Schedule Trigger (morning, per timezone)
  → Query appointments for today and tomorrow
  → For each upcoming appointment:
      → Send reminder SMS to lead via Twilio
         "Reminder: You have an appointment [today/tomorrow] at [time] with [org_name]."
      → Send reminder email to lead via Resend (if contact has email)
  → (Optional) INSERT INTO notifications for broker awareness
```

**Dependencies:** Twilio credentials, Resend API key.

#### 7.6a Daily Summary Email — **DEFERRED**

*Future feature. Morning digest email with yesterday's stats (calls, bookings, pipeline movement). Requires HTML email templates and per-timezone scheduling. Add after core workflows are stable.*

---

## Phase 8: Wire Frontend to Backend [SEQUENTIAL]
*Connect all the mock-data pages to real Supabase queries and Edge Functions.*

### → 8.1 Create Data Access Layer (M)
- `src/lib/queries/` — server-side query functions using Supabase client
  - `dashboard.ts` — home page aggregations
  - `campaigns.ts` — campaign CRUD + stats
  - `leads.ts` — lead queries with contact joins
  - `calls.ts` — call queries with filters
  - `appointments.ts` — calendar queries
  - `action-items.ts` — unresolved items
  - `settings.ts` — all settings reads/writes
- `src/lib/actions/` — server actions for mutations
  - `campaign-actions.ts`
  - `lead-actions.ts`
  - `call-actions.ts`
  - `appointment-actions.ts`
  - `action-item-actions.ts`
  - `settings-actions.ts`

### → 8.2 Replace Mock Data with Real Queries (L)
- Update each page component to use server-side data fetching
- Implement loading states (skeletons)
- Implement error states
- Add pagination where needed (leads, calls)
- Add real-time subscriptions for action items and notifications (Supabase Realtime)

### → 8.3 Wire Mutations (M)
- Connect all buttons/forms to server actions and Edge Functions
- Add optimistic updates where appropriate
- Add toast notifications for success/error states
- Test all write paths end-to-end

---

## Phase 9: Integration Testing & Polish [SEQUENTIAL]

### → 9.1 End-to-End Flow Testing (L)
Test complete workflows:
1. **Signup flow:** Register → create org → login → see empty dashboard
2. **Campaign creation flow:** Create agent request → create campaign → add leads via CSV → set schedule → launch
3. **Call simulation:** Trigger test call via Retell → post-call webhook fires → call appears in dashboard → action item created → resolve it
4. **Appointment flow:** Book via action item → appears on calendar → sync to Google Calendar → reschedule → cancel
5. **Billing flow:** Stripe webhook → subscription updated → billing page reflects changes
6. **DNC flow:** Add number to DNC → verify excluded from campaigns → verbal DNC during call → auto-added

### → 9.2 UI Polish Pass (M)
- Responsive behavior (sidebar collapse on mobile)
- Loading skeletons for all data-dependent sections
- Empty states for all lists (no campaigns yet, no calls yet, etc.)
- Transition animations matching prototype
- Keyboard navigation
- Focus management in modals
- **Notification email/SMS templates:** Redesign the HTML email layout and copy for each notification type (appointment_booked, hot_lead_alert, sms_reply_received, campaign_completed, etc.). Also review SMS message copy for tone and brevity. Current templates in `deliver-notification` Edge Function are functional but generic.

### → 9.3 Seed Data Script (S)
- Create a seed script that populates realistic demo data matching the prototype
- Organizations, users, contacts, leads, campaigns, calls, appointments, action items
- Useful for demos and testing

---

## Phase Summary — Dependency Graph

```
Phase 0: Scaffolding ─────────────────────────────── [MUST BE FIRST]
    ├─ 0.1 Next.js init
    ├─ 0.2 Supabase setup
    └─ 0.3 Design system
         │
Phase 1: Database Schema ─────────────────────────── [MUST BE SECOND]
    ├─ 1.1 Core tables
    ├─ 1.2 Supporting tables
    ├─ 1.3 Indexes
    ├─ 1.4 RLS policies
    └─ 1.5 Type generation
         │
Phase 2: Auth ─────────────────────────────────────── [MUST BE THIRD]
    └─ 2.1 Auth pages + logic
         │
Phase 3: App Shell ────────────────────────────────── [MUST BE FOURTH]
    └─ 3.1 Layout + sidebar + routes
         │
         ├──────────────────────────────────────────────────┐
         │                                                  │
Phase 4: Core Pages [PARALLEL]          Phase 6: Edge Functions [PARALLEL]
    ├─ 4.1 Home/Dashboard                  ├─ 6.1 Call initiation
    ├─ 4.2 Campaigns + Wizard              ├─ 6.2 SMS sending
    ├─ 4.3 Leads + Detail                  ├─ 6.3 Lead import
    ├─ 4.4 Calls + Detail                  ├─ 6.4 Campaign management
    └─ 4.5 Calendar                        ├─ 6.5 Lead status
         │                                 ├─ 6.6 Action item resolution
Phase 5: Settings Pages [PARALLEL]        ├─ 6.7 Appointment management
    ├─ 5.1 Profile & Notifications         ├─ 6.8 Calendar availability (stub)
    ├─ 5.2 Billing                         ├─ 6.9 Dashboard stats
    ├─ 5.3 Organization                    ├─ 6.10 Stripe portal
    ├─ 5.4 Team                            ├─ 6.11 Notifications
    ├─ 5.5 Agents                          └─ 6.12 Verification + agents
    ├─ 5.6 Verification                        │
    ├─ 5.7 Integrations              Phase 7: Webhooks & Workflows [PARALLEL with 6]
    └─ 5.8 Compliance                     │
         │                                ├─ 7.0 Notification delivery system ← DONE ✓
         │                                │     (Edge Function + DB triggers + vault)
         │                                │
         │                                ├─ 7.1 Retell post-call webhook (N8N, XL)
         │                                ├─ 7.2 Twilio SMS webhook (Next.js API route, M)
         │                                ├─ 7.3 Stripe webhook (Next.js API route, M)
         ├────────────────────────────────├─ 7.4 Campaign processor (N8N, DONE ✓)
         │                                ├─ 7.5 Calendar sync (Edge Function, PREP ONLY)
         │                                └─ 7.6 Appointment reminders (N8N, S)
         │                                     │
         └─────────────┬───────────────────────┘
                       │
Phase 8: Wire Frontend ↔ Backend ──────────────────── [SEQUENTIAL]
    ├─ 8.1 Data access layer
    ├─ 8.2 Replace mock data
    └─ 8.3 Wire mutations
                       │
Phase 9: Testing & Polish ─────────────────────────── [SEQUENTIAL]
    ├─ 9.1 E2E flow testing
    ├─ 9.2 UI polish
    └─ 9.3 Seed data script
```

---

## Parallelization Strategy for Claude Code Sub-Agents

### Maximum Parallelism Opportunities

**After Phase 3 completes, launch up to 10 parallel sub-agents:**

| Agent | Task | Est. Time |
|---|---|---|
| Agent A | 4.1 Home/Dashboard page | XL |
| Agent B | 4.2 Campaigns + Wizard | L |
| Agent C | 4.3 Leads + Detail | L |
| Agent D | 4.4 Calls + Detail | L |
| Agent E | 4.5 Calendar page | L |
| Agent F | 5.1–5.4 Settings: Profile, Billing, Org, Team | M (combined) |
| Agent G | 5.5–5.8 Settings: Agents, Verification, Integrations, Compliance | M (combined) |
| Agent H | 6.1–6.6 Edge Functions: Calls, SMS, Import, Campaigns, Leads, Actions | L (combined) |
| Agent I | 6.7–6.12 Edge Functions: Appointments, Calendar, Dashboard, Stripe, Notifications, Misc | L (combined) |
| Agent J | 7.1–7.3 N8N Webhooks: Retell, Twilio, Stripe | XL (combined) |

**Recommended practical approach:** Run 4–5 sub-agents at a time to maintain code quality and avoid merge conflicts.

### Suggested Sub-Agent Batches

**Batch 1 (after Phase 3):**
- Agent A: Home/Dashboard
- Agent B: Campaigns + Wizard
- Agent C: Leads + Detail
- Agent D: Calls + Detail

**Batch 2 (while Batch 1 runs):**
- Agent E: Calendar
- Agent F: Settings group 1 (Profile, Billing, Org, Team)
- Agent G: Settings group 2 (Agents, Verification, Integrations, Compliance)

**Batch 3 (after Batch 1–2 merge):**
- Agent H: Edge Functions group 1
- Agent I: Edge Functions group 2

**Batch 4 (after Edge Functions):**
- Agent J: N8N Webhooks + Workflows

**Batch 5 (final):**
- Phase 8: Wire everything together (single agent, sequential)
- Phase 9: Testing + polish (single agent, sequential)

---

## File Structure — Final State

```
courtside-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── magic-link/page.tsx
│   │   │   └── auth/callback/route.ts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── leads/page.tsx
│   │   │   ├── calls/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       ├── billing/page.tsx
│   │   │       ├── organization/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── agents/
│   │   │       │   ├── page.tsx
│   │   │       │   └── new/page.tsx
│   │   │       ├── verification/page.tsx
│   │   │       ├── integrations/page.tsx
│   │   │       └── compliance/page.tsx
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       ├── retell/route.ts
│   │   │       ├── twilio/route.ts
│   │   │       └── stripe/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                    (shadcn/ui + custom primitives)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── dashboard/             (home page specific)
│   │   ├── campaigns/             (campaign page specific)
│   │   ├── leads/                 (leads page specific)
│   │   ├── calls/                 (calls page specific)
│   │   ├── calendar/              (calendar page specific)
│   │   └── settings/              (settings page specific)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── queries/               (server-side data fetching)
│   │   ├── actions/               (server actions for mutations)
│   │   ├── stripe/
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-realtime.ts
│   │   └── use-notifications.ts
│   └── types/
│       ├── database.types.ts      (generated)
│       └── index.ts               (derived types)
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_tables.sql
│   │   ├── 002_supporting_tables.sql
│   │   ├── 003_indexes.sql
│   │   └── 004_rls_policies.sql
│   └── functions/
│       ├── initiate-call/
│       ├── send-sms/
│       ├── import-leads/
│       ├── create-campaign/
│       ├── update-campaign-status/
│       ├── update-lead-status/
│       ├── resolve-action-item/
│       ├── create-appointment/
│       ├── reschedule-appointment/
│       ├── cancel-appointment/
│       ├── check-availability/
│       ├── sync-appointment-to-calendar/
│       ├── dashboard-stats/
│       ├── stripe-portal-url/
│       ├── get-notifications/
│       ├── mark-notifications-read/
│       ├── submit-verification/
│       └── submit-agent-request/
├── public/
│   └── courtside-logo.svg
├── .env.local
├── .env.local.example
├── CLAUDE.md
├── courtside-data-model.md
├── courtside-development-plan.md
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

*This plan should be executed phase by phase, with the parallelization strategy determining how many sub-agents work simultaneously at each stage. The data model document is the single source of truth for all schema and field references.*
