# Bug Debugging Notes

> Running log of bugs encountered during development, their symptoms, root causes, and fixes.
> Organized reverse-chronologically (newest first).

---

## Bug #9: Timezone Double-Application in Date Parser

**Date:** 2026-02-27
**Severity:** High (all exact time requests off by timezone offset)
**Area:** `_shared/date-parser.ts` → chrono-node output handling

### Symptoms
- "Thursday at 2pm" parsed as 9:00 AM (off by -5 hours, the UTC offset for America/Toronto)
- "Thursday at 1pm" parsed as 8:00 AM
- All exact time requests were wrong by exactly the timezone offset

### Root Cause
The date parser gives chrono-node a timezone-shifted reference date via `getReferenceDate()`:
```typescript
const localStr = now.toLocaleString("en-US", { timeZone: timezone });
return new Date(localStr); // local time stuffed into a UTC Date
```
This makes chrono interpret "2pm" as 2pm local time, but its output `result.start.date()` stores 14:00 in the UTC fields of the Date object (because the reference was in a fake UTC frame).

Then `dateToTimeStr(startDate, timezone)` was called, which does:
```typescript
date.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false })
```
This converts 14:00 UTC → 9:00 AM ET, applying the timezone offset a **second time**.

### Fix
Extract hours/minutes from chrono output using **UTC methods** (`getUTCHours()`, `getUTCMinutes()`, etc.) since the timezone-shifted reference means UTC fields already represent campaign-local time:
```typescript
const parsedDateStr = `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth()+1)}-${pad(startDate.getUTCDate())}`;
const timeStr = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}`;
```
Added `chronoDateToDateStr()` helper and applied same fix to "after X", "before X", and "time-of-day" patterns.

### Lesson Learned
- When using a timezone-shifted reference date with chrono-node, the output is in a "fake UTC" frame. Never convert it through the timezone again.
- Test exact time parsing with non-UTC timezones during development.

---

## Bug #8: Availability Flow Returns `available: true` for General Time Queries

**Date:** 2026-02-27
**Severity:** Medium (agent behavior incorrect but not crashing)
**Area:** `agent-check-availability` response building

### Symptoms
- Prospect says "Thursday afternoon" → agent check-availability returns `available: true`
- The Retell agent interprets this as "time confirmed, proceed to book" and tries to book without asking the prospect which specific time they want
- No specific time was actually confirmed

### Root Cause
For range/day_only/earliest queries, the response was:
```json
{ "available": true, "alternatives": [...] }
```
The Retell agent saw `available: true` and skipped the selection step.

### Fix
For non-exact queries, return `available: false` with a new `needs_selection: true` field:
```json
{ "available": false, "needs_selection": true, "alternatives": [...] }
```
Updated `generateSpeakableResponse()` in `speech.ts` to produce natural conversational responses for same-day options: "On Thursday, I have 12, 12:30, or 1 PM available. Which works best for you?"

The Retell agent now reads `speakableResponse`, asks the prospect to pick, and only after getting an exact time does it call check-availability again → gets `available: true` → then books.

### Lesson Learned
- Voice agent tool responses must be unambiguous about whether the agent should proceed or ask for more input.
- `available: true` should ONLY mean "this exact time slot is confirmed available, proceed to book."

---

## Bug #7: Book Appointment Fails with Non-UUID `call_id`

**Date:** 2026-02-27
**Severity:** Medium (500 error during booking)
**Area:** `agent-book-appointment` Edge Function → DB insert

### Symptoms
- Book appointment returns 500: "Failed to create appointment"
- Supabase logs show FK constraint violation on `call_id`

### Root Cause
Retell test calls use `call_id: "test-debug"` which is not a valid UUID. The appointments table has a foreign key constraint on `call_id` referencing the `calls` table (UUID type). Inserting a non-UUID string caused a constraint violation.

### Fix
Added UUID regex validation before including `call_id` in the insert:
```typescript
...(call_metadata?.call_id &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(call_metadata.call_id) &&
  { call_id: call_metadata.call_id }),
```

### Lesson Learned
- Always validate external IDs before using them in DB operations, especially FKs.
- Test calls from Retell use non-UUID call IDs — handle gracefully.

---

## Bug #6: 12-Hour Time Format Causes "Invalid array length" Crash

**Date:** 2026-02-27
**Severity:** Critical (500 error, function crashes)
**Area:** `agent-check-availability` → `parseTimeToMinutes()`

### Symptoms
- Check availability returns 500: "Invalid array length"
- Stack trace points to `new Array(totalMinutes).fill(false)` in `computeAvailableSlots()`

### Root Cause
Campaign appointment schedules store time slots in 12-hour format: `{"start": "9:00 AM", "end": "5:00 PM"}`. The `parseTimeToMinutes()` function only handled 24-hour format (`"09:00"`, `"17:00"`). Parsing `"5:00 PM"` produced `NaN`, and `new Array(NaN)` throws "Invalid array length".

### Fix
Updated `parseTimeToMinutes()` to handle both 12h and 24h formats:
```typescript
function parseTimeToMinutes(time: string): number {
  const trimmed = time.trim();
  const isPM = /pm/i.test(trimmed);
  const isAM = /am/i.test(trimmed);
  const cleaned = trimmed.replace(/\s*(am|pm)\s*/i, "");
  const [h, m] = cleaned.split(":").map(Number);
  let hours = h;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + (m || 0);
}
```

### Lesson Learned
- Check how data is actually stored in the DB, not how you assume it's stored. The campaign wizard saves times in 12h format.
- Any function that parses time strings should handle both 12h and 24h formats defensively.

---

## Bug #5: Retell Agent Payload Format Mismatch

**Date:** 2026-02-27
**Severity:** Critical (all agent tools broken — 400/500 errors)
**Area:** All three agent Edge Functions (`agent-check-availability`, `agent-book-appointment`, `agent-reschedule-appointment`)

### Symptoms (multiple cascading issues)

**Issue A — Auth failure (401):**
- Retell sends the legacy JWT (219 chars, `eyJhbG...`) as Bearer token
- `SUPABASE_SERVICE_ROLE_KEY` env var is hex format (64 chars, `9776520...`)
- Simple string comparison `token === serviceKey` always fails

**Issue B — Base64 decode failure (500):**
- Initial JWT decode fix used `atob()` directly on the JWT payload
- JWT uses base64url encoding (`-` and `_` characters), not standard base64 (`+` and `/`)
- `atob()` throws `InvalidCharacterError: Failed to decode base64`

**Issue C — Payload extraction failure (400: "campaign_id is required"):**
- Edge Functions expected flat request body: `{ campaign_id, org_id, lead_id, ... }`
- Retell sends: `{ name: "tool_name", args: { ...tool_params }, call: { call_id, metadata: { campaign_id, org_id, ... }, retell_llm_dynamic_variables: { ... } } }`
- Tool parameters are in `args`, context IDs are in `call.metadata`

### Root Cause
Three separate issues in sequence:
1. **Auth:** Service role key format difference between env var and JWT
2. **Encoding:** base64url vs base64 incompatibility
3. **Payload:** Retell's custom tool request format was not documented in our codebase

### Fix

**Auth (`verifyServiceAuth`):** Added `decodeBase64Url` helper with proper base64url→base64 conversion:
```typescript
function decodeBase64Url(str: string): string {
  let b64 = str.trim().replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(binary);
}
```
Decodes JWT payload and checks `payload.role === "service_role"`.

**Payload extraction:** All three functions now detect Retell format and extract accordingly:
```typescript
const isRetell = rawBody.args !== undefined || rawBody.call !== undefined;
const args = isRetell ? (rawBody.args ?? {}) : rawBody;
const callObj = rawBody.call ?? {};
const meta = callObj.metadata ?? {};
const dynVars = callObj.retell_llm_dynamic_variables ?? {};

// Tool params from args, context from metadata
const campaign_id = args.campaign_id || meta.campaign_id || dynVars.campaign_id;
```

**Deployment:** All three functions deployed with `--no-verify-jwt` since they handle auth internally (Retell doesn't have a Supabase user JWT).

### Retell Custom Tool Request Format (Reference)
```json
{
  "name": "check_availability",
  "args": {
    "requested_time_string": "Thursday afternoon"
  },
  "call": {
    "call_id": "uuid-from-retell",
    "metadata": {
      "campaign_id": "...",
      "org_id": "...",
      "lead_id": "...",
      "contact_id": "..."
    },
    "retell_llm_dynamic_variables": {
      "first_name": "John",
      "campaign_id": "..."
    }
  }
}
```

### Lesson Learned
- **Read the external API docs first** before assuming payload format. Each deploy-test cycle takes ~2 minutes with Retell — guessing is extremely expensive.
- **`SUPABASE_SERVICE_ROLE_KEY`** env var in Edge Functions is the hex key, NOT the JWT. The JWT is stored separately in Vault (`service_role_key` secret). Auth code must handle both formats.
- **base64url ≠ base64.** JWTs use base64url encoding. Always convert `-`→`+`, `_`→`/`, and add `=` padding before `atob()`.
- **Deploy with `--no-verify-jwt`** for Edge Functions called by external services (Retell, N8N) that don't have Supabase user tokens. The function handles its own auth.
- Document external API payload formats in the codebase to prevent future confusion.

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
