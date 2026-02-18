# Courtside AI — CLAUDE.md

> **This file is the primary context for any Claude Code agent working on this project.**
> Read this first. It tells you what the project is, where to find the detailed specs, and how to write code that fits.

---

## What Is This?

Courtside AI is a SaaS platform for financial services professionals (mortgage brokers, insurance agents) that provides **AI-powered voice agents** to make and receive phone calls on their behalf. The platform manages campaigns, leads, calls, appointments, and post-call automation.

**Core user flow:** Broker signs up → creates an AI voice agent → uploads leads → launches a calling campaign → AI calls leads, books appointments, and surfaces action items → broker follows up.

---

## Planning Documents (READ THESE)

These three files are the source of truth. **Before building anything**, read the relevant document:

| Document | Path | What It Contains |
|---|---|---|
| **Data Model** | `docs/courtside-data-model.md` | 22 database tables, all columns/types/constraints, enums, RLS policies, screen-to-table mapping, post-call analysis schema, automation flows, calendar integration, notification system |
| **Development Plan** | `docs/courtside-development-plan.md` | 10 phases (0–9), dependency graph, parallelization strategy, file structure, task complexity estimates |
| **UI Prototype** | `docs/courtside-prototype.jsx` | Interactive React prototype with all screens, design tokens, mock data structures, component patterns |

### When to reference each:
- **Building a page?** → Read the prototype for UI structure + the data model Section 5 (Screen-to-Table Mapping) for what data it needs
- **Writing a migration?** → Read data model Section 4 (Database Tables) + Section 3 (Enums)
- **Creating an Edge Function?** → Read data model Section 6 (Backend Functions & APIs)
- **Working on post-call logic?** → Read data model Section 7 (Post-Call Analysis) + Section 8 (Automation Flows)
- **Building calendar features?** → Read data model Section 9 (Calendar Integration)
- **Working on notifications?** → Read data model Section 10 (Notification Delivery)
- **Writing RLS policies?** → Read data model Section 11

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Fonts**: Inter (UI), Lora (brand mark only)
- **Icons**: Lucide React
- **State**: React Server Components where possible, Zustand for client state if needed
- **Deployment**: Vercel

### Backend
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (email/password + magic link)
- **API Layer**: Supabase Edge Functions (auth-gated)
- **Orchestration**: N8N (self-hosted) — webhooks, workflows, scheduled jobs
- **Billing**: Stripe (existing account)
- **Voice AI**: Retell AI
- **Telephony / SMS**: Twilio

---

## Architecture Rules

1. **N8N-first for orchestration** — Multi-step workflows, webhook processing, and scheduled jobs go through N8N. Don't build this logic in Next.js API routes.
2. **Supabase Edge Functions for auth-gated logic** — Custom API endpoints that need user auth context (call initiation, lead import, etc.).
3. **Supabase direct for simple CRUD** — Use the Supabase client SDK for straightforward reads/writes from the frontend.
4. **RLS on every table** — All tables use `org_id` for tenant isolation. The standard policy pattern:
   ```sql
   USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
   WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
   ```
5. **Dashboard is source of truth** — Calendar sync, notifications, and automation all flow from data in Supabase, not from external services.
6. **Keep it simple** — Don't over-engineer. Add complexity only when needed.

---

## Code Conventions

### Naming
- **Files**: `kebab-case` (e.g., `campaign-wizard.tsx`, `dashboard-stats.ts`)
- **Components**: `PascalCase` (e.g., `CampaignCard`, `ActionItemList`)
- **Variables/Functions**: `camelCase` (e.g., `getLeadsByStatus`, `handleResolve`)
- **Database columns**: `snake_case` (e.g., `org_id`, `last_call_outcome`)

### File Organization
- Page-specific components: colocate in a `_components/` folder next to the page
- Shared components: `src/components/shared/`
- UI primitives (shadcn + custom): `src/components/ui/`
- Layout components (sidebar, header): `src/components/layout/`
- Server queries: `src/lib/queries/`
- Server actions: `src/lib/actions/`
- Supabase clients: `src/lib/supabase/`
- Custom hooks: `src/hooks/`
- Types: `src/types/`

### TypeScript
- Strict mode everywhere
- Use Supabase generated types (`src/types/database.types.ts`) for all database interactions
- Create derived types in `src/types/index.ts` (e.g., `LeadWithContact`, `CallWithAgent`)
- No `any` types unless absolutely unavoidable

### Supabase
- Always validate auth before processing in Edge Functions
- Environment variables: `NEXT_PUBLIC_` prefix for client-side only
- Use `@supabase/ssr` for server component auth
- Service role key is used only by N8N and Edge Functions that receive external webhooks

---

## Design System — Key Values

The dark theme is foundational. All colors come from the prototype's design tokens:

```
Background:     #0e1117 (main), #0a0d12 (sidebar)
Cards:          rgba(255,255,255,0.025), hover: rgba(255,255,255,0.045)
Borders:        rgba(255,255,255,0.06)
Text:           #e8eaed (primary), rgba(255,255,255,0.5) (muted), rgba(255,255,255,0.3) (dim)

Emerald (primary accent):  #34d399 (light), #059669 (dark/buttons)
Amber (warnings/callbacks): #fbbf24
Blue (info/interested):     #60a5fa
Red (errors/negative):      #f87171
Purple (special):           #a78bfa

Badge backgrounds: 8-15% opacity of their accent color
Card top accents: 40% opacity of accent color, 2px border-top
```

### Brand Mark
- Font: Lora, weight 600
- Text: "Courtside AI"
- Logo SVG: `public/courtside-logo.svg`

### Component Patterns (from prototype)
- **Stat cards**: Icon + uppercase label + large number + optional subtitle, with colored top border
- **Badges**: Colored background (low opacity) + colored text, 6px radius, 11px font
- **Tables**: Full-width, hover rows, alternating subtle backgrounds
- **Section labels**: 10px, uppercase, letter-spacing 0.15em, dim color, 700 weight
- **Progress bars**: 5px height, rounded, dark track with colored fill
- **Modals**: Dark background, rounded corners, centered

---

## Data Model Quick Reference

### Core Entities
| Table | Purpose | Key Relationships |
|---|---|---|
| `organizations` | Multi-tenant root | Everything belongs to an org |
| `users` | Team members | → organizations |
| `contacts` | People/companies | → organizations. Unique on (org_id, phone) |
| `leads` | Contact's campaign journey | → contacts, campaigns. Unique on (contact_id, campaign_id) |
| `campaigns` | Calling campaigns | → organizations, agents |
| `agents` | AI voice agents | → organizations |
| `calls` | Every call made/received | → leads, contacts, agents, campaigns |
| `appointments` | Booked meetings | → leads, contacts, campaigns, calls |
| `action_items` | Tasks for broker attention | → contacts, leads, calls |

### Key Enums
```
Lead Status:    new, contacted, interested, appt_set, showed, closed_won, closed_lost, bad_lead
Call Outcome:   booked, interested, callback, voicemail, no_answer, not_interested, wrong_number, dnc
Campaign Status: draft, active, paused, completed
Agent Status:   active, pending, inactive
Agent Direction: inbound, outbound
```

### The `metadata` JSONB Pattern
The `calls.metadata` field stores the full structured post-call analysis JSON (financial details, objections, topics, follow-up intelligence, compliance flags). First-class columns exist for frequently queried fields: `outcome`, `ai_summary`, `summary_one_line`, `sentiment`, `engagement_level`, `outcome_confidence`.

---

## Route Structure

```
src/app/
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── magic-link/page.tsx
│   └── auth/callback/route.ts
├── (dashboard)/
│   ├── layout.tsx              ← sidebar + header wrapper
│   ├── page.tsx                ← redirects to /dashboard
│   ├── dashboard/page.tsx      ← Home / Dashboard
│   ├── campaigns/
│   │   ├── page.tsx            ← Campaign list
│   │   └── new/page.tsx        ← 4-step campaign wizard
│   ├── leads/page.tsx          ← Leads list + detail
│   ├── calls/page.tsx          ← Calls list + detail
│   ├── calendar/page.tsx       ← Monthly calendar + detail panel
│   └── settings/
│       ├── page.tsx            ← redirects to /settings/profile
│       ├── profile/page.tsx
│       ├── billing/page.tsx
│       ├── organization/page.tsx
│       ├── team/page.tsx
│       ├── agents/
│       │   ├── page.tsx
│       │   └── new/page.tsx
│       ├── verification/page.tsx
│       ├── integrations/page.tsx
│       └── compliance/page.tsx
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# External services
N8N_WEBHOOK_BASE_URL=
RETELL_API_KEY=
```

---

## Key Workflows (How Data Flows)

1. **Post-Call Analysis**: Retell webhook → N8N → parse structured `call_analysis` JSON → insert `calls` → update `leads` status → update campaign/agent stats → trigger outcome-specific automation (see data model Section 8)
2. **Outbound Call (one-off)**: Frontend → Edge Function `initiate-call` → Retell API → call starts
3. **Outbound Campaign**: Frontend creates campaign → N8N scheduled workflow picks next lead every minute → Retell API → call
4. **Inbound Call**: Twilio → Retell agent → post-call webhook → same as #1
5. **Appointment Booking**: AI extracts date/time → N8N creates appointment in DB → sends confirmation SMS/email to lead → notifies broker → syncs to Google/Outlook Calendar
6. **Calendar Availability**: During live call, Retell agent → Edge Function `check-availability` → reads Google/Outlook Calendar + existing appointments → returns available slots

---

## Important Notes for Agents

- **Retell post-call webhook** delivers a structured `call_analysis` JSON defined in data model Section 7.2. This drives everything downstream.
- **Voice agent configuration happens in Retell directly** — our app only displays agent info and accepts requests for new agents (read-only for V1).
- **Phone numbers are managed in Twilio** and ported to Retell — no need to manage provisioning in our app directly.
- **Stripe account already exists** — integrate with the existing account, don't create a new one.
- **N8N is self-hosted** — webhook URLs use the `N8N_WEBHOOK_BASE_URL` env var.
- **Calendar integration is optional** — the system works without it. When connected, AI reads availability; the database writes back to calendar.
- **All tables have `org_id`** — never forget tenant isolation. Every query must scope to the user's org.
- **Contacts vs Leads**: Contact = the person. Lead = that person's journey in a specific campaign. One contact → many leads. The leads table has `(contact_id, campaign_id)` unique constraint.

---

## Phase Execution Summary

See `docs/courtside-development-plan.md` for full details. The short version:

| Phase | What | Sequential/Parallel |
|---|---|---|
| 0 | Scaffolding (Next.js + Supabase + design system) | SEQUENTIAL — blocker |
| 1 | Database schema (migrations + types) | SEQUENTIAL — blocker |
| 2 | Auth flow (login/signup/middleware) | SEQUENTIAL — blocker |
| 3 | App shell (layout + sidebar + routes) | SEQUENTIAL — blocker |
| 4 | Core pages (Home, Campaigns, Leads, Calls, Calendar) | PARALLEL |
| 5 | Settings pages (8 sub-pages) | PARALLEL |
| 6 | Edge Functions (12 functions) | PARALLEL |
| 7 | N8N Webhooks & Workflows | PARALLEL with Phase 6 |
| 8 | Wire frontend ↔ backend | SEQUENTIAL |
| 9 | Testing & polish | SEQUENTIAL |

**Build pages with mock data first (Phases 4–5), then wire to real data (Phase 8).** This lets frontend and backend work in parallel.

---

*Last updated: February 2026*
