# Bug Debugging Notes

> Running log of bugs encountered during development, their symptoms, root causes, and fixes.
> Organized reverse-chronologically (newest first).

---

## Bug #4: Campaign Wizard — Calendar & Appointment Schedules Not Saved

**Date:** 2026-02-27
**Severity:** Medium (data silently dropped)
**Area:** `create-campaign` Edge Function deployment

### Symptoms
- User selects an Outlook calendar in the campaign wizard (Step 4: Settings)
- Campaign is created successfully, no error shown
- But `calendar_connection_id` is `null` in the database
- Appointment schedules (business hours for booking) also not saved to `campaign_appointment_schedules` table

### Investigation Steps
1. Checked wizard component — `calendarConnectionId` state is captured correctly
2. Checked `handleSubmit` — sends `calendar_connection_id: calendarConnectionId || null` to Edge Function
3. Checked `callEdgeFunction` helper — does `JSON.stringify(body)` with no filtering
4. Checked local Edge Function source (`supabase/functions/create-campaign/index.ts`) — includes `calendar_connection_id` and `appointment_schedules`
5. **Checked deployed Edge Function via Supabase MCP** — the deployed v2 was from the initial batch deployment and was **missing both fields entirely**

### Root Cause
The `create-campaign` Edge Function was updated locally (added `calendar_connection_id` and `appointment_schedules` support) but **never redeployed to Supabase**. The deployed v2 had the old `CreateCampaignBody` interface without these fields, so they were silently ignored by the Deno runtime during `await req.json()` typed parsing. The campaign insert also didn't include `calendar_connection_id`.

### Fix
Redeployed `create-campaign` Edge Function: v2 → v3, now includes:
- `calendar_connection_id` in the interface and insert
- `appointment_schedules` handling with insert into `campaign_appointment_schedules`

### Lesson Learned
- **Local code ≠ deployed code for Edge Functions.** Unlike Next.js (which auto-deploys via Vercel), Supabase Edge Functions must be explicitly redeployed. When adding fields to an Edge Function, always redeploy it.
- When a field is silently `null` despite the frontend sending it, check the **deployed** version of the Edge Function, not just the local source.
- Consider adding a deployment checklist or script that redeploys all Edge Functions together.

---

## Bug #3: Outlook Calendar OAuth — Edge Function 401

**Date:** 2026-02-27
**Severity:** Blocking (integration unusable)
**Area:** OAuth callback → Supabase Edge Function

### Symptoms
- User completes Microsoft login successfully, gets redirected back to the app
- App shows "Failed to connect Outlook Calendar"
- Edge Function logs show `POST /functions/v1/calendar-oauth-callback` returning 401 (execution_time_ms: 131)
- Supabase API logs show `/auth/v1/user` returning 200 and `refresh_token` returning 200 — the JWT appears valid

### Investigation Steps
1. Added `refreshSession()` before `getSession()` in callback route to ensure fresh JWT — still 401
2. Checked Supabase API logs — all auth calls returning 200, so JWT is valid
3. Compared `calendar-oauth-callback` Edge Function settings against all other 20 functions
4. **Discovery:** `calendar-oauth-callback` and `crm-oauth-callback` were deployed with `verify_jwt: true`. All other 20 functions use `verify_jwt: false`.

### Root Cause
When `verify_jwt: true` is set on a Supabase Edge Function, the **API gateway** validates the JWT before the function code runs. The gateway-level JWT validation was rejecting the request with 401, even though the functions already handle auth internally via `getAuthContext()`. The exact reason the gateway rejected a valid JWT is unclear (possibly related to how the `apikey` header was being passed from the server-side Next.js route), but the gateway-level validation was unnecessary since the function does its own auth.

### Fix
Redeployed both functions with `verify_jwt: false` to match all other Edge Functions:
- `calendar-oauth-callback`: v2 → v3
- `crm-oauth-callback`: v2 → v3

### Lesson Learned
- Always deploy Edge Functions with `verify_jwt: false` when the function handles its own auth via `getAuthContext()`. Gateway-level JWT validation is redundant and can cause subtle failures.
- When debugging Edge Function 401s, check the `verify_jwt` setting first — it's a gateway-level config that rejects requests before your code runs.

---

## Bug #2: Outlook OAuth — `redirect_uri` Newline Character

**Date:** 2026-02-27
**Severity:** Blocking (OAuth flow completely broken)
**Area:** OAuth URL generation → Microsoft Azure AD

### Symptoms
- Clicking "Connect Outlook" shows Microsoft error: `AADSTS90102: 'redirect_uri' value must be a valid absolute URI`
- Inspecting the Microsoft OAuth URL revealed `%0A` (URL-encoded newline) between the domain and path: `https://services.court-side.ai%0A/api/integrations/outlook/callback`

### Investigation Steps
1. First assumed trailing slash issue — added `.replace(/\/+$/, "")` to strip trailing slashes — didn't help
2. User provided the actual Microsoft URL showing `%0A` character
3. Traced to `NEXT_PUBLIC_SITE_URL` env var in Vercel having a trailing newline

### Root Cause
The `NEXT_PUBLIC_SITE_URL` environment variable in Vercel was set with a trailing newline character. Because `NEXT_PUBLIC_*` variables are **inlined at build time** by Next.js, runtime `.trim()` cannot fix a newline that's already baked into the JavaScript bundle.

### Fix (two parts)
1. **Code:** Added `.trim().replace(/\/+$/, "")` to `getSiteUrl()` in `src/lib/integrations/oauth.ts` and to `siteUrl` in all three callback routes — this prevents future occurrences
2. **Env var:** User deleted and re-created the `NEXT_PUBLIC_SITE_URL` env var in Vercel dashboard without the trailing newline, then redeployed

### Lesson Learned
- `NEXT_PUBLIC_*` env vars are baked at build time. Runtime `.trim()` only helps if the trimmed value was baked in. The env var itself must be clean.
- Always `.trim()` env vars defensively, but know that for `NEXT_PUBLIC_*` the trim must happen before the build.
- When OAuth redirect_uri errors happen, inspect the actual URL being sent (URL-decode it) to spot invisible characters.

---

## Bug #1: Outlook OAuth — Session Expiry During Redirect

**Date:** 2026-02-27
**Severity:** Medium (contributed to 401 debugging, but not the root cause)
**Area:** OAuth callback route → Supabase session management

### Symptoms
- After OAuth redirect round-trip (user leaves app → Microsoft login → returns), the Supabase session JWT might be expired

### Investigation Steps
- OAuth redirect takes the user away from the app for 30-60 seconds
- The Supabase JWT has a short expiry (default 1 hour, but can be shorter depending on config)
- The callback route was using `getSession()` which reads from local store without refreshing

### Fix
Changed all three callback routes (`google`, `outlook`, `hubspot`) to call `refreshSession()` first, with `getSession()` as fallback:
```typescript
const { data: refreshData } = await supabase.auth.refreshSession();
let session = refreshData?.session;
if (!session) {
  const { data: sessionData } = await supabase.auth.getSession();
  session = sessionData?.session;
}
```

### Lesson Learned
- Always use `refreshSession()` in OAuth callback routes since the user has been away from the app
- `getSession()` reads from local store; `refreshSession()` actually validates and renews the token

---

*Add new bugs above this line, following the same format.*
