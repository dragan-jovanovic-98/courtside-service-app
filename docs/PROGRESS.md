# Courtside AI — Build Progress Tracker

> Updated as each step completes. Check marks indicate done.

---

## Phase 0: Project Scaffolding [BLOCKER] ✅

- [x] **0.1 Create Project Folder & Initialize Next.js** (S)
  - [x] `npx create-next-app` with TypeScript, Tailwind, ESLint, App Router, src dir
  - [x] Install core deps: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `lucide-react`
  - [x] Install shadcn/ui + 14 components (button, card, badge, dialog, dropdown-menu, input, select, table, tabs, toggle, separator, tooltip, avatar, progress)
  - [x] `.env.local.example` with all env var placeholders
  - [x] `tsconfig.json` strict mode + `@/*` path alias
  - [x] Tailwind config with dark theme colors matching design tokens

- [x] **0.2 Supabase Project Setup** [GATE] (S)
  - [x] Supabase client utilities: `client.ts`, `server.ts`, `middleware.ts`
  - [x] `src/middleware.ts` for auth route protection
  - [ ] Add actual env vars to `.env.local` (waiting on credentials)

- [x] **0.3 Design System Foundation** (M)
  - [x] `src/lib/design-tokens.ts` — design tokens + badge color maps
  - [x] Tailwind `@theme` extended with all custom colors (emerald, amber, blue, red, purple, surfaces, text hierarchy)
  - [x] Google Fonts: Inter (UI) + Lora (brand mark) via `next/font/google`
  - [x] Global styles: dark background `#0e1117`, custom scrollbar, Inter font
  - [x] Custom UI primitives:
    - [x] `stat-card.tsx` — metric card with icon + accent border
    - [x] `colored-badge.tsx` — 6 color variants
    - [x] `progress-bar.tsx` — thin 5px progress bar
    - [x] `section-label.tsx` — uppercase tracking label
    - [x] `outcome-row.tsx` — label + progress bar + count
    - [x] `action-dropdown.tsx` — dropdown menu with icons
    - [x] `dropdown-select.tsx` — filter dropdown with active state
    - [x] `data-table.tsx` — generic typed table with hover rows
    - [x] `modal.tsx` — dark-styled dialog wrapper
  - [x] Logo copied to `public/courtside-logo.svg`
  - [x] Project builds successfully

---

## Phase 1: Database Schema [BLOCKER] ✅

- [x] **1.1 Core Tables Migration** (L)
  - [x] Enum types (lead_status, call_outcome, campaign_status, etc.)
  - [x] organizations
  - [x] users (FK → organizations)
  - [x] contacts (FK → organizations)
  - [x] campaigns (FK → organizations)
  - [x] agents (FK → organizations)
  - [x] leads (FK → contacts, campaigns, organizations)
  - [x] campaign_schedules (FK → campaigns)
  - [x] calls (FK → leads, contacts, agents, campaigns, organizations)
  - [x] appointments (FK → leads, contacts, campaigns, calls, organizations)
  - [x] action_items (FK → contacts, leads, calls, organizations)

- [x] **1.2 Supporting Tables Migration** (M)
  - [x] phone_numbers
  - [x] dnc_list
  - [x] subscriptions
  - [x] invoices
  - [x] verification
  - [x] compliance_settings
  - [x] notification_preferences
  - [x] integrations
  - [x] sms_messages
  - [x] emails
  - [x] notifications
  - [x] workflow_events

- [x] **1.3 Indexes Migration** (S)
  - [x] Performance indexes from data model Appendix

- [x] **1.4 RLS Policies Migration** (M)
  - [x] Enable RLS on all tables
  - [x] Org-based isolation policies
  - [x] Special policies for users, notification_preferences, workflow_events

- [x] **1.5 Generate TypeScript Types** (S)
  - [x] `src/types/database.types.ts` (generated)
  - [x] `src/types/index.ts` (derived types: LeadWithContact, CallWithAgent, etc.)

---

## Phase 2: Auth Flow [BLOCKER] ✅

- [x] **2.1 Auth Pages & Logic** (M)
  - [x] `login/page.tsx` — email/password login
  - [x] `signup/page.tsx` — registration with org creation
  - [x] `magic-link/page.tsx` — magic link request
  - [x] `auth/callback/route.ts` — auth callback handler
  - [x] `src/lib/supabase/auth.ts` — auth helper functions
  - [x] Post-signup flow: create org + user with owner role

---

## Phase 3: App Shell & Layout [BLOCKER] ✅

- [x] **3.1 Dashboard Layout** (M)
  - [x] `(dashboard)/layout.tsx` — authenticated layout wrapper
  - [x] `sidebar.tsx` — nav items, brand mark, user info, active states
  - [x] `header.tsx` — notification bell
  - [x] All route files created as empty placeholder pages (19 routes)

---

## Phase 4: Core Pages — Frontend [PARALLEL] ✅

- [x] **4.1 Home Page / Dashboard** (XL)
  - [x] Greeting header + New Campaign button
  - [x] Action Zone: Today's Appointments + Action Items (Follow Up/Resolve dropdowns, resolved state with undo)
  - [x] Results section: 4 metric cards, Engaged Leads card, Call Outcomes chart, Conversion Funnel
  - [x] Active Campaigns cards (3-column grid with progress bars)

- [x] **4.2 Campaigns Page** (L)
  - [x] Stats bar (Total, Active, Total Leads, Bookings) + status filter tabs
  - [x] Campaign cards with progress bar, booking count, connected/duration/remaining stats, pause/resume buttons
  - [x] New Campaign Wizard (4-step form: Agent → Leads → Schedule → Review)

- [x] **4.3 Leads Page** (L)
  - [x] Stats bar + search + Status/Outcome filter dropdowns
  - [x] Leads table (name/company, phone, status badge, outcome badge, last activity, campaign)
  - [x] Lead Detail View with contact card, status management (contextual actions), action buttons, timeline

- [x] **4.4 Calls Page** (L)
  - [x] Stats bar (Total, Today, Connected, Booked) + Direction/Outcome/Campaign filters
  - [x] Calls table with direction icons
  - [x] Call Detail View (5-stat header, AI Summary, recording player, transcript, Call Again/View Lead)

- [x] **4.5 Calendar Page** (L)
  - [x] Stats bar + campaign color legend
  - [x] Monthly calendar grid (28-day Feb) with colored appointment pills
  - [x] Upcoming This Week list
  - [x] Appointment Detail Panel (slide-out with contact, time, AI summary, Call Now/Reschedule/Cancel)

---

## Phase 5: Settings Pages — Frontend [PARALLEL] ✅

- [x] **5.1 Profile & Notifications** (M)
- [x] **5.2 Billing** (M)
- [x] **5.3 Organization** (S)
- [x] **5.4 Team Management** (M)
- [x] **5.5 Agents** (M)
- [x] **5.6 Verification** (M)
- [x] **5.7 Integrations** (S)
- [x] **5.8 Compliance** (M)

---

## Phase 6: Backend — Edge Functions [PARALLEL] ✅

- [x] **6.1 Call Initiation** (M) — `initiate-call`
- [x] **6.2 SMS Sending** (M) — `send-sms`
- [x] **6.3 Lead Import** (L) — `import-leads`
- [x] **6.4 Campaign Management** (M) — `create-campaign`, `update-campaign-status`
- [x] **6.5 Lead Status Management** (S) — `update-lead-status`
- [x] **6.6 Action Item Resolution** (S) — `resolve-action-item`
- [x] **6.7 Appointment Management** (M) — `create-appointment`, `reschedule-appointment`, `cancel-appointment`
- [x] **6.8 Calendar Availability Check** (L) — `check-availability` (stub — returns mock slots, real calendar API deferred)
- [x] **6.9 Dashboard Stats** (M) — `dashboard-stats`
- [x] **6.10 Stripe Billing Portal** (S) — `stripe-portal-url`
- [x] **6.11 Notifications** (S) — `get-notifications`, `mark-notifications-read`
- [x] **6.12 Verification & Agent Requests** (S) — `submit-verification`, `submit-agent-request`

---

## Phase 7: Backend — Webhooks, Workflows & Notification System 🔄 IN PROGRESS

*Revised Feb 2026. Split across N8N, Next.js API routes, and Edge Functions. See `courtside-development-plan.md` Phase 7 for full details.*

### Schema Migration (prerequisite)
- [ ] DB trigger on `notifications` table → calls `deliver-notification` Edge Function
- [ ] DB trigger on `appointments` table → calls `sync-appointment-to-calendar` Edge Function (stub)
- [ ] Verify `integrations.config` JSONB supports calendar OAuth fields

### 7.0 Notification Delivery System (Edge Function + DB trigger) — BUILD FIRST
- [ ] `deliver-notification` Edge Function
  - [ ] Read `notification_preferences` for user + event type
  - [ ] Send email via SendGrid (if enabled)
  - [ ] Send SMS to broker via Twilio (if enabled)
  - [ ] In-app: automatic (row exists in `notifications` table)
- [ ] DB trigger on `notifications` INSERT → calls Edge Function

### 7.1 Retell Post-Call Webhook (N8N) — XL
- [x] Create detailed markdown blueprint (`docs/n8n-blueprints/retell-post-call.md`)
- [ ] Build workflow manually in n8n visual editor using blueprint
- [ ] Configure credentials (OpenAI, Twilio, SendGrid, Supabase)
- [ ] Test with real data
- [ ] Activate

### 7.2 Twilio SMS Webhook (Next.js API Route) — M
- [ ] `src/app/api/webhooks/twilio/route.ts`
- [ ] Twilio signature verification
- [ ] Match org via to_number → phone_numbers table
- [ ] Match contact by from_number + org_id
- [ ] STOP keyword → DNC flow
- [ ] Insert sms_messages + create action_item + insert notification

### 7.3 Stripe Webhook (Next.js API Route) — M
- [ ] `src/app/api/webhooks/stripe/route.ts`
- [ ] Stripe signature verification (constructEvent)
- [ ] checkout.session.completed → link Stripe customer to org
- [ ] subscription created/updated/deleted → upsert subscriptions
- [ ] invoice paid/failed → upsert invoices (failed → notify broker via email)
- [ ] Log workflow_events

### 7.4 Campaign Processor (N8N) — M
- [x] Edge Function `get-next-campaign-leads` built (contains all business logic)
- [x] Create detailed markdown blueprint (`docs/n8n-blueprints/campaign-processor.md`)
- [ ] Build workflow manually in n8n visual editor using blueprint
- [ ] Configure credentials
- [ ] Test with real data
- [ ] Activate

### 7.5 Calendar Sync (Edge Function + DB Trigger) — PREP ONLY
- [ ] `sync-appointment-to-calendar` Edge Function stub (logs event, no external API calls)
- [ ] DB trigger on `appointments` INSERT/UPDATE/DELETE
- [ ] `check-availability` Edge Function stub (already exists from Phase 6, verify interface)
- [ ] **DEFERRED:** Google OAuth flow + Calendar API
- [ ] **DEFERRED:** Outlook OAuth flow + Microsoft Graph API

### 7.6 Appointment Reminders (N8N) — S
- [x] Create detailed markdown blueprint (`docs/n8n-blueprints/appointment-reminders.md`)
- [ ] Build workflow manually in n8n visual editor using blueprint
- [ ] Configure credentials (Twilio, SendGrid, Supabase)
- [ ] Test with real data
- [ ] Activate

---

## Phase 8: Wire Frontend to Backend [SEQUENTIAL]

- [ ] **8.1 Create Data Access Layer** (M)
- [ ] **8.2 Replace Mock Data with Real Queries** (L)
- [ ] **8.3 Wire Mutations** (M)

---

## Phase 9: Integration Testing & Polish [SEQUENTIAL]

- [ ] **9.1 End-to-End Flow Testing** (L)
- [ ] **9.2 UI Polish Pass** (M)
- [ ] **9.3 Seed Data Script** (S)

---

## Deferred to Post-Core (after Phases 7-9 complete)

| Item | Description | Phase |
|---|---|---|
| Google Calendar Integration | OAuth flow, Calendar API read/write, connect button in Settings | Post-7.5 |
| Outlook Calendar Integration | Microsoft OAuth, Graph API, calendar sync | Post-7.5 |
| Daily Summary Email | Morning digest with yesterday's stats, HTML email templates | Post-7.6 |
| Inbound Call Handling | Post-call webhook for inbound calls (contact matching by phone, create unknown contacts) | Post-7.1 |
| SMS Auto-Response / Chatbot | Automated replies to inbound SMS, potential AI chatbot | Future |
| Payment Failure Restrictions | Feature gating, banners, grace periods on failed payment | Future |
| Usage-Based Billing | Per-minute tracking, Stripe usage reporting for select customers | Future |

---

*Last updated: 2026-02-19 — Phases 0-6 complete. Phase 7 in progress. N8N blueprints complete for 7.1, 7.4, 7.6 (ready to build manually).*
