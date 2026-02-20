# Pre-Deploy Fixes (Phase 9.5)

> Items discovered during E2E testing that need to be addressed before production.

---

## Auth / Onboarding

- [ ] **Supabase Auth email templates** — Default emails are unstyled and not production-ready. Need to customize confirmation email, magic link email, and password reset email templates in Supabase dashboard (Authentication → Email Templates). Brand with Courtside AI logo, colors, and copy.

---

## UI / Copy

- [x] ~~Auth pages tagline: "financial services" → "service businesses"~~ *(fixed during testing)*

## Sidebar / Navigation

- [x] ~~**Add sign-out button** — Added LogOut icon button next to user info in sidebar~~ *(fixed during testing)*
- [ ] **User avatar → profile picture** — Currently shows initials in an emerald circle. Consider supporting profile photo upload (or at minimum, make the initials area clickable to go to profile settings).

---

## Billing

- [x] ~~**Wire billing page to real data** — Now queries `subscriptions` and `invoices` tables. Shows empty states when no Stripe data exists.~~ *(wired during testing)*
- [ ] **Wire "Open Stripe Billing Portal" link** — Deferred until production Stripe setup. Edge function `stripe-portal-url` exists, just needs to be connected.
- [ ] **Usage tracking (minutes, phone numbers)** — Progress bars show placeholders. Need a usage tracking mechanism.
- [ ] **Phone numbers table** — Removed mock data. Needs a `phone_numbers` table or Twilio API integration.

## Campaigns

- [x] ~~**Field name mismatches in campaign wizard** — `daily_limit` → `daily_call_limit`, `csv_text` → `csv`, `schedule` → `schedules` with correct format~~ *(fixed during testing)*

## Deployment

- [x] ~~**Deploy all Supabase Edge Functions** — All 21 functions deployed to project `xkwywpqrthzownikeill`~~ *(deployed during testing)*
- [x] ~~**Disable gateway `verify_jwt` on all user-facing functions** — Auth enforced inside each function via `getAuthContext()` + RLS.~~ *(fixed during testing)*

## Team

- [ ] **Proper team invite flow** — Needs Supabase Auth `inviteUserByEmail` (admin API) to send real invite emails.
- [x] ~~Add error handling to invite modal~~ *(fixed during testing)*

## Settings Pages Wired

- [x] ~~**Agents** — Now fetches from `agents` table with campaign counts. Request form submits to `submit-agent-request` edge function.~~ *(wired during testing)*
- [x] ~~**Verification** — Now fetches/stores in `verification` table. Form submits to `submit-verification` edge function. Status banner reflects actual state (not verified / in progress / verified).~~ *(wired during testing)*
- [x] ~~**Compliance** — DNC stats from real `dnc_list` table. Toggle settings persist to `compliance_settings` table via server action.~~ *(wired during testing)*
- [ ] **Integrations** — Deferred (actual OAuth for Google/Outlook Calendar is a separate phase).

## Calls / Webhooks

- [ ] **Remove `SKIP_TWILIO_SIGNATURE_CHECK`** — Added to `.env.local` and `src/app/api/webhooks/twilio/route.ts` for local DNC testing. Must be removed (or not set) in production Vercel env vars.
- [ ] **Set up Stripe webhook endpoint** — Create in Stripe Dashboard → Developers → Webhooks. Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Set signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel.

## Calendar / Appointments

- [ ] **Rework "Call Now" button** — Should trigger a direct broker-to-contact call, NOT an AI agent call. Currently disabled.
- [x] ~~Disabled "Call Now" button on calendar detail panel~~ *(disabled during testing)*
