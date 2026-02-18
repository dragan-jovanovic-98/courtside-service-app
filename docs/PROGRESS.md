# Courtside AI — Build Progress Tracker

> Updated as each step completes. Check marks indicate done.

---

## Phase 0: Project Scaffolding [BLOCKER]

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

## Phase 5: Settings Pages — Frontend [PARALLEL]

- [ ] **5.1 Profile & Notifications** (M)
- [ ] **5.2 Billing** (M)
- [ ] **5.3 Organization** (S)
- [ ] **5.4 Team Management** (M)
- [ ] **5.5 Agents** (M)
- [ ] **5.6 Verification** (M)
- [ ] **5.7 Integrations** (S)
- [ ] **5.8 Compliance** (M)

---

## Phase 6: Backend — Edge Functions [PARALLEL]

- [ ] **6.1 Call Initiation** (M)
- [ ] **6.2 SMS Sending** (M)
- [ ] **6.3 Lead Import** (L)
- [ ] **6.4 Campaign Management** (M)
- [ ] **6.5 Lead Status Management** (S)
- [ ] **6.6 Action Item Resolution** (S)
- [ ] **6.7 Appointment Management** (M)
- [ ] **6.8 Calendar Availability Check** (L)
- [ ] **6.9 Dashboard Stats** (M)
- [ ] **6.10 Stripe Billing Portal** (S)
- [ ] **6.11 Notifications** (S)
- [ ] **6.12 Verification & Agent Requests** (S)

---

## Phase 7: Backend — N8N Workflows [PARALLEL with Phase 6]

- [ ] **7.1 Retell Post-Call Webhook** (XL)
- [ ] **7.2 Twilio SMS Webhook** (M)
- [ ] **7.3 Stripe Webhook** (M)
- [ ] **7.4 Campaign Processor** (L)
- [ ] **7.5 Calendar Sync Workflow** (M)
- [ ] **7.6 Daily Summary & Appointment Reminders** (M)

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

*Last updated: 2026-02-18 — Phases 0, 1, 2, 3 & 4 complete*
