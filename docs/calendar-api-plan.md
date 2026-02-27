# Courtside AI — Calendar API & Middleware Implementation Plan

> **Purpose:** Build a robust, adaptable Calendar API middleware that serves both the Courtside dashboard and AI voice agents (Retell). Outlook/Azure is the priority integration; Google is already partially built and will be brought to parity.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What Already Exists](#2-what-already-exists)
3. [What We're Building](#3-what-were-building)
4. [API Endpoint Design](#4-api-endpoint-design)
5. [Outlook / Azure AD Integration](#5-outlook--azure-ad-integration)
6. [Natural Language Date Parsing](#6-natural-language-date-parsing)
7. [Database Changes](#7-database-changes)
8. [Edge Function Implementation Details](#8-edge-function-implementation-details)
9. [AI Agent Response Format](#9-ai-agent-response-format)
10. [Calendar Event Write Path](#10-calendar-event-write-path)
11. [Error Handling & Resilience](#11-error-handling--resilience)
12. [Documentation Deliverables](#12-documentation-deliverables)
13. [Implementation Phases](#13-implementation-phases)
14. [File Manifest](#14-file-manifest)

---

## 1. Architecture Overview

### Two-Layer Design

```
┌──────────────────────────────────────────────────────────┐
│                    CONSUMERS                              │
│                                                           │
│  Retell AI Agent        Dashboard UI        N8N Workflows │
│  (natural language)     (structured)        (structured)  │
└──────────┬──────────────────┬──────────────────┬─────────┘
           │                  │                  │
           ▼                  │                  │
┌──────────────────────────┐   │                  │
│  AGENT TOOL LAYER        │   │                  │
│  (new Edge Functions)    │   │                  │
│                          │   │                  │
│  • agent-check-          │   │                  │
│    availability          │   │                  │
│    (NLP input → slots)   │   │                  │
│                          │   │                  │
│  • agent-book-           │   │                  │
│    appointment           │   │                  │
│    (ISO time → confirm)  │   │                  │
│                          │   │                  │
│  • agent-reschedule      │   │                  │
│    (ISO time → confirm)  │   │                  │
│                          │   │                  │
│  Resolves all context    │   │                  │
│  from campaign_id in     │   │                  │
│  agent call metadata.    │   │                  │
│  Returns structured      │   │                  │
│  JSON + speech hints.    │   │                  │
└──────────┬───────────────┘   │                  │
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                    CORE API LAYER                         │
│                  (existing + enhanced)                     │
│                                                           │
│  • check-availability     (GET — structured date input)   │
│  • create-appointment     (POST — structured data)        │
│  • sync-appointment-to-   (POST — calendar write-back)    │
│    calendar                                               │
│  • calendar-oauth-        (POST — token exchange)         │
│    callback                                               │
│  • list-calendars         (GET — new)                     │
│  • calendar-status        (GET — new)                     │
│  • update-calendar-       (PATCH — new)                   │
│    connection                                             │
│                                                           │
│  Accepts structured params only                           │
│  Provider-agnostic (Google & Outlook)                     │
│  Used by dashboard, agent layer, and N8N                  │
└──────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│                 SHARED INFRASTRUCTURE                      │
│                                                           │
│  • _shared/oauth.ts        (token refresh — exists)       │
│  • _shared/date-parser.ts  (NLP date parsing — new)       │
│  • _shared/calendar-       (provider abstraction — new)   │
│    providers.ts                                           │
│  • _shared/speech.ts       (speech hint generator — new)  │
│  • _shared/auth.ts         (auth context — exists)        │
│  • _shared/response.ts     (response helpers — exists)    │
└──────────────────────────────────────────────────────────┘
```

### Why Two Layers?

1. **Core layer stays clean** — Dashboard and N8N call structured endpoints directly. No NLP overhead.
2. **Agent layer is specialized** — `agent-check-availability` handles natural language input and enriches responses with speech hints. `agent-book-appointment` and `agent-reschedule-appointment` accept structured ISO times (since the agent already resolved the time during the availability check) but still add speech hints and resolve all campaign context server-side.
3. **Each layer is independently useful** — You can use the core API without the agent layer, or swap the agent layer for a different AI provider.
4. **Future expansion** — When you add lead lookup or campaign stats tools, the same agent-layer pattern applies: minimal input from agent metadata → server resolves context → enriched response.

---

### Agent Call Metadata & Context Resolution

This is a critical design principle: **the agent endpoints accept minimal input and resolve everything server-side from `campaign_id`.**

When a Retell AI agent initiates or receives a call, the call is created with metadata (set during `initiate-call`). This metadata rides along with every tool call the agent makes during the conversation:

```json
{
  "call": {
    "metadata": {
      "campaign_id": "uuid",
      "lead_id": "uuid",
      "contact_id": "uuid",
      "org_id": "uuid",
      "agent_id": "uuid"
    },
    "from_number": "+1234567890",
    "to_number": "+0987654321",
    "retell_call_id": "retell_xxx"
  }
}
```

**What `campaign_id` unlocks (resolved server-side, no extra agent config needed):**

| Data | Source Table | Why It Matters |
|---|---|---|
| `calendar_connection_id` | `campaigns` | Which calendar to check/write to |
| `default_meeting_duration` | `campaigns` | Slot size when duration not specified |
| `booking_enabled` | `campaigns` | Whether the AI can actually book, or just note the time |
| `max_advance_days` | `campaigns` | How far ahead the AI can look |
| `min_notice_hours` | `campaigns` | Earliest bookable slot from "now" |
| Business hours + buffer | `campaign_appointment_schedules` | Which days/times are valid, with buffer between appointments |
| Calendar provider + tokens | `calendar_connections` → `integrations` | Google vs Outlook, OAuth credentials |
| Org timezone | `organizations` | Default timezone for date parsing |

**What `lead_id` / `contact_id` provide:**

| Data | Why It Matters |
|---|---|
| Lead association | Appointment is linked to the correct lead record |
| Contact details | Name, phone, email for the calendar event and confirmation SMS |
| Campaign journey | Appointment updates the lead's status in the campaign |

**What `org_id` provides:**

| Data | Why It Matters |
|---|---|
| Tenant isolation | All queries scope to the correct organization |
| Service key auth | Agent endpoints use service key (not user JWT), so `org_id` in metadata provides tenant context |

**Design implication:** The Retell tool definitions are dead simple — the agent just passes its metadata plus the human utterance (for check-availability) or the selected ISO time (for booking/rescheduling). All intelligence lives in our API. If a broker changes their buffer time, switches calendars, or updates business hours, the agent doesn't need reconfiguration — our API picks up the new settings automatically.

**The typical agent call flow:**

```
1. CHECK AVAILABILITY (NLP input)
   Agent passes: campaign_id + "Tuesday at 2pm"
   Our API resolves: calendar, business hours, buffer, timezone
   Our API returns: structured slots + speakableResponse

2. BOOK APPOINTMENT (structured input)
   Lead agrees to a slot → Agent passes: campaign_id + lead_id +
   contact_id + org_id + the exact ISO time from step 1
   Our API resolves: calendar connection, creates event, fires N8N
   Our API returns: confirmation + speakableResponse

3. RESCHEDULE (structured input, if needed)
   Agent passes: appointment_id + campaign_id + the new ISO time
   (also from a prior check-availability call)
   Our API resolves: existing appointment, updates calendar event
   Our API returns: confirmation + speakableResponse
```

NLP parsing only happens in step 1. Steps 2 and 3 use the precise ISO timestamps that were already validated during the availability check.

---

## 2. What Already Exists

### Edge Functions (working)
| Function | Status | Notes |
|---|---|---|
| `check-availability` | ✅ Built | GET, takes `date` (YYYY-MM-DD) + `campaign_id`. Returns available slots. Supports Google + Outlook. |
| `create-appointment` | ✅ Built | POST, structured input. Creates DB record + fires N8N webhook. |
| `calendar-oauth-callback` | ✅ Built | POST, exchanges auth code for tokens. Creates integration + calendar_connections. Supports Google + Outlook. |
| `sync-appointment-to-calendar` | ✅ Built | POST, writes appointment to Google/Outlook Calendar. Called by N8N. |

### Shared Modules (working)
| Module | Status | Notes |
|---|---|---|
| `_shared/oauth.ts` | ✅ Built | Token refresh for Google, Outlook, HubSpot. Auto-updates DB. Marks `needs_reauth` on failure. |
| `_shared/auth.ts` | ✅ Built | JWT extraction → `{ userId, orgId }`. |
| `_shared/supabase-client.ts` | ✅ Built | User client (JWT) + service client (service role key). |
| `_shared/cors.ts` | ✅ Built | Standard CORS headers. |
| `_shared/response.ts` | ✅ Built | `jsonResponse()` + `errorResponse()`. |

### Database Tables (migrated)
| Table | Status | Notes |
|---|---|---|
| `integrations` | ✅ | Stores OAuth tokens in `config` JSONB. Has `account_email`, `service_type`. |
| `calendar_connections` | ✅ | Individual calendars per integration. `provider`, `provider_calendar_id`, `is_enabled_for_display`, `sync_direction`. |
| `campaign_appointment_schedules` | ✅ | Business hours per campaign per day-of-week. JSONB `slots` array. |
| `appointments` | ✅ | Has `calendar_connection_id`, `sync_status`, `is_manual`. |
| `campaigns` | ✅ | Has `calendar_connection_id` FK. |

### Frontend (working)
| Component | Status | Notes |
|---|---|---|
| OAuth initiation (Google + Outlook URLs) | ✅ | `src/lib/integrations/oauth.ts` |
| OAuth callback routes | ✅ | `/api/integrations/google/callback` + `/api/integrations/outlook/callback` |
| Integrations settings page | ✅ | Connect/disconnect/configure UI |

### What the Reference Repo Does Well (that we'll adopt)
1. **Speech-optimized time formatting** — "2:00 PM" not "14:00", "Tuesday, Jan 28" not "2025-01-28"
2. **Alternatives generation** — When requested time is unavailable, automatically find 3 next-best slots
3. **"Earliest available" handling** — When no specific time is requested, search forward intelligently
4. **Simple webhook response contract** — `{ available, requestedTime, alternatives }` is clean for AI consumption
5. **chrono-node for NLP parsing** — Handles "Tuesday at 2pm", "tomorrow morning", "next week" naturally
6. **Time-of-day period mapping** — "morning" → 9:00-12:00, "afternoon" → 12:00-17:00, "evening" → 17:00-20:00

### What the Reference Repo Gets Wrong (that we'll fix)
1. **Single-provider** — Only Google. We need Google + Outlook unified.
2. **No campaign context** — Uses flat `client_id`. We need campaign-scoped availability (different campaigns → different calendars → different business hours).
3. **No buffer time** — Doesn't account for travel/prep time between appointments.
4. **Standalone server** — Fastify on DigitalOcean. We'll use Supabase Edge Functions (serverless, same infra).
5. **Token encryption complexity** — AES-256-GCM in application code. We use Supabase RLS + service role key instead (simpler, equally secure for our use case).
6. **No multi-calendar merging** — Checks one calendar. We may need to check multiple (personal + work).
7. **No Courtside appointment overlay** — Only checks external calendar. We also need to check our own appointments table for double-booking prevention.
8. **Fragile date parsing edge cases** — The chrono-node approach is good but needs timezone hardening and business-hours awareness built into the parser itself.

---

## 3. What We're Building

### New Edge Functions

| Function | Method | Auth | Input Type | Purpose |
|---|---|---|---|---|
| `agent-check-availability` | POST | Service key (from Retell) | **NLP string** (`"Tuesday at 2pm"`) | AI agent tool: parses natural language, returns availability + speech hints |
| `agent-book-appointment` | POST | Service key (from Retell) | **Structured ISO** (`"2026-02-28T15:00:00-05:00"`) | AI agent tool: books a specific slot (from prior availability check), creates appointment + calendar event |
| `agent-reschedule-appointment` | POST | Service key (from Retell) | **Structured ISO** (`"2026-03-02T10:00:00-05:00"`) | AI agent tool: reschedules to a specific slot (from prior availability check), updates appointment + calendar event |
| `list-calendars` | GET | User JWT | Dashboard: list all calendars for a connected integration |
| `calendar-status` | GET | User JWT or Service key | Check connection health (token valid? calendar accessible?) |
| `update-calendar-connection` | PATCH | User JWT | Dashboard: update calendar settings (enable/disable, sync direction) |

### New Shared Modules

| Module | Purpose |
|---|---|
| `_shared/date-parser.ts` | Natural language → structured date/time. Timezone-aware. Business-hours-aware. |
| `_shared/calendar-providers.ts` | Provider abstraction: unified interface for Google + Outlook calendar operations |
| `_shared/speech.ts` | Generate speech-friendly time strings and response sentences |

### Enhanced Existing Functions

| Function | Changes |
|---|---|
| `check-availability` | Add buffer time support, multi-day range queries, "now" awareness (filter past slots for today) |
| `create-appointment` | Add calendar event creation inline (optional), return richer response |

### Database Migration

| Change | Table | Details |
|---|---|---|
| Add `buffer_minutes` column | `campaign_appointment_schedules` | Default 0. Applied before and after each busy period. |
| Add `default_meeting_duration` column | `campaigns` | Default 30. Used when duration not specified in agent call. |
| Add `booking_enabled` column | `campaigns` | Default true. AI can check availability but only book if enabled. |
| Add `max_advance_days` column | `campaigns` | Default 14. How far ahead the AI can book. |
| Add `min_notice_hours` column | `campaigns` | Default 2. Minimum hours from now that can be booked. |

---

## 4. API Endpoint Design

### 4.1 `agent-check-availability` (The Primary AI Tool)

This is the most important endpoint. It's what the Retell AI agent calls during a live phone call.

**Method:** POST
**Auth:** Service role key (Retell calls this via custom function URL)
**Content-Type:** application/json

**Request:**
```json
{
  "campaign_id": "uuid",
  "org_id": "uuid",
  "requested_time_string": "Tuesday at 2pm",
  "lead_id": "uuid (optional — for context)",
  "contact_id": "uuid (optional — for context)",
  "timezone": "America/Toronto (optional — defaults to campaign/org timezone)",
  "duration_minutes": 30,
  "call_metadata": {
    "retell_call_id": "...",
    "agent_id": "uuid",
    "from_number": "+1..."
  }
}
```

**Field notes:**
- `campaign_id`, `org_id` — From agent call metadata. `campaign_id` is the key that resolves all scheduling context. `org_id` provides tenant isolation (since agent calls use service key, not user JWT).
- `requested_time_string` — The raw natural language input from the lead. This is the ONLY endpoint that accepts NLP input.
- `lead_id`, `contact_id` — Optional, from agent metadata. Not used for availability logic, but logged for analytics.
- `timezone` — Optional override. If omitted, resolved from `organizations.timezone` via the campaign's org.
- `duration_minutes` — Optional. If omitted, resolved from `campaigns.default_meeting_duration`.

**Input variations the NLP parser handles:**
| Input | Interpretation |
|---|---|
| `"Tuesday at 2pm"` | Next Tuesday, 14:00 in client timezone |
| `"tomorrow morning"` | Tomorrow, search 9:00-12:00 |
| `"February 28th at 3:30"` | Specific date/time |
| `"next week"` | Monday-Friday next week, find earliest |
| `"earliest available"` or `""` or `null` | Search from now forward through max_advance_days |
| `"today after 4pm"` | Today, 16:00 onwards |
| `"Friday"` | Next Friday, search all business hours |
| `"in about an hour"` | ~60 min from now |

**Response — Available:**
```json
{
  "available": true,
  "requestedTime": "Tuesday, February 28 at 2:00 PM",
  "requestedTimeISO": "2026-02-28T14:00:00-05:00",
  "endTime": "2:30 PM",
  "endTimeISO": "2026-02-28T14:30:00-05:00",
  "duration_minutes": 30,
  "timezone": "America/Toronto",
  "alternatives": null,
  "speakableResponse": "Great news! Tuesday, February 28th at 2:00 PM is available. Shall I book that for you?",
  "meta": {
    "campaign_id": "uuid",
    "calendar_provider": "outlook",
    "slots_checked": 1,
    "parse_confidence": "exact"
  }
}
```

**Response — Unavailable:**
```json
{
  "available": false,
  "requestedTime": "Tuesday, February 28 at 2:00 PM",
  "requestedTimeISO": "2026-02-28T14:00:00-05:00",
  "alternatives": [
    {
      "time": "Tuesday, February 28 at 3:00 PM",
      "timeISO": "2026-02-28T15:00:00-05:00",
      "endTime": "3:30 PM",
      "endTimeISO": "2026-02-28T15:30:00-05:00"
    },
    {
      "time": "Tuesday, February 28 at 4:30 PM",
      "timeISO": "2026-02-28T16:30:00-05:00",
      "endTime": "5:00 PM",
      "endTimeISO": "2026-02-28T16:30:00-05:00"
    },
    {
      "time": "Wednesday, March 1 at 10:00 AM",
      "timeISO": "2026-03-01T10:00:00-05:00",
      "endTime": "10:30 AM",
      "endTimeISO": "2026-03-01T10:30:00-05:00"
    }
  ],
  "speakableResponse": "Unfortunately, Tuesday at 2:00 PM is not available. I do have openings at 3:00 PM on Tuesday, 4:30 PM on Tuesday, or 10:00 AM on Wednesday. Would any of those work for you?",
  "meta": {
    "campaign_id": "uuid",
    "calendar_provider": "outlook",
    "slots_checked": 48,
    "parse_confidence": "exact"
  }
}
```

**Response — Earliest Available (no specific time requested):**
```json
{
  "available": true,
  "requestedTime": null,
  "alternatives": [
    {
      "time": "Today at 3:30 PM",
      "timeISO": "2026-02-27T15:30:00-05:00",
      "endTime": "4:00 PM",
      "endTimeISO": "2026-02-27T16:00:00-05:00"
    },
    {
      "time": "Tomorrow at 9:00 AM",
      "timeISO": "2026-02-28T09:00:00-05:00",
      "endTime": "9:30 AM",
      "endTimeISO": "2026-02-28T09:30:00-05:00"
    },
    {
      "time": "Tomorrow at 11:00 AM",
      "timeISO": "2026-02-28T11:00:00-05:00",
      "endTime": "11:30 AM",
      "endTimeISO": "2026-02-28T11:30:00-05:00"
    }
  ],
  "speakableResponse": "The earliest I have available is today at 3:30 PM. I also have tomorrow at 9:00 AM and 11:00 AM. Which works best for you?",
  "meta": {
    "campaign_id": "uuid",
    "calendar_provider": "outlook",
    "slots_checked": 96,
    "parse_confidence": "none_requested"
  }
}
```

**Response — Day not available (weekend, no business hours):**
```json
{
  "available": false,
  "requestedTime": "Saturday, March 1",
  "alternatives": [
    {
      "time": "Monday, March 3 at 9:00 AM",
      "timeISO": "2026-03-03T09:00:00-05:00",
      "endTime": "9:30 AM",
      "endTimeISO": "2026-03-03T09:30:00-05:00"
    }
  ],
  "speakableResponse": "I'm sorry, we don't have availability on Saturday. The earliest I can offer is Monday, March 3rd at 9:00 AM. Would that work?",
  "meta": {
    "campaign_id": "uuid",
    "reason": "day_not_available",
    "parse_confidence": "day_only"
  }
}
```

**Response — Calendar not connected:**
```json
{
  "available": null,
  "error": "calendar_not_connected",
  "speakableResponse": "I apologize, but I'm unable to check the calendar right now. Let me take down your preferred time and someone will confirm shortly.",
  "meta": {
    "campaign_id": "uuid",
    "fallback": "manual_confirmation"
  }
}
```

**Response — Calendar token expired / needs reauth:**
```json
{
  "available": null,
  "error": "calendar_auth_expired",
  "speakableResponse": "I apologize, but I'm unable to access the calendar at this moment. Let me note your preferred time and we'll confirm your appointment shortly.",
  "meta": {
    "campaign_id": "uuid",
    "fallback": "manual_confirmation"
  }
}
```

### 4.2 `agent-book-appointment` (Booking Tool)

**Method:** POST
**Auth:** Service role key

> **Key design decision:** This endpoint accepts a **structured ISO datetime**, not a natural language string. By the time the agent calls this, the availability check has already happened — the agent and lead agreed on a specific slot from the structured alternatives returned by `agent-check-availability`. There is no reason to re-parse natural language here; it would only introduce ambiguity and risk.

**Request:**
```json
{
  "campaign_id": "uuid",
  "lead_id": "uuid",
  "contact_id": "uuid",
  "org_id": "uuid",
  "scheduled_at": "2026-02-28T15:00:00-05:00",
  "duration_minutes": 30,
  "notes": "Client interested in refinancing, wants to discuss fixed vs variable rates",
  "call_metadata": {
    "retell_call_id": "...",
    "call_id": "uuid",
    "agent_id": "uuid"
  }
}
```

**Field notes:**
- `scheduled_at` — Exact ISO 8601 datetime with timezone offset, taken directly from a `timeISO` value returned by `agent-check-availability`. No parsing needed.
- `duration_minutes` — Optional. If omitted, resolved from `campaigns.default_meeting_duration`.
- `campaign_id` — Used to resolve: calendar connection (for event creation), booking_enabled, and all campaign context.
- `lead_id`, `contact_id`, `org_id` — From the agent's call metadata. Used for the appointment record, tenant isolation, and downstream automation.
- `notes` — Optional. The AI agent may populate this with conversation context (e.g., topics discussed, lead's interests).

**Logic flow:**
1. Validate `scheduled_at` is a valid ISO datetime (no NLP parsing — deterministic validation only)
2. Resolve campaign context from `campaign_id` (calendar_connection_id, booking_enabled, duration default)
3. Check `booking_enabled` — if false, return a "noted" response (appointment not created, but preferred time logged)
4. Re-verify availability at `scheduled_at` (prevent race conditions — someone could have booked since the check)
5. If still available → create appointment in DB via `create-appointment` core logic
6. If calendar connected → create calendar event immediately (synchronous, don't wait for N8N)
7. Fire N8N webhook for downstream (confirmation SMS to lead, notification to broker)
8. Return confirmation with speakable response

**Response — Booked:**
```json
{
  "booked": true,
  "appointment_id": "uuid",
  "time": "Tuesday, February 28 at 3:00 PM",
  "timeISO": "2026-02-28T15:00:00-05:00",
  "endTime": "3:30 PM",
  "endTimeISO": "2026-02-28T15:30:00-05:00",
  "duration_minutes": 30,
  "calendar_event_created": true,
  "speakableResponse": "Perfect! I've booked your appointment for Tuesday, February 28th at 3:00 PM. You'll receive a confirmation shortly. Is there anything else I can help with?"
}
```

**Response — Slot taken (race condition):**
```json
{
  "booked": false,
  "reason": "slot_taken",
  "alternatives": [
    {
      "time": "Tuesday, February 28 at 4:00 PM",
      "timeISO": "2026-02-28T16:00:00-05:00",
      "endTime": "4:30 PM",
      "endTimeISO": "2026-02-28T16:30:00-05:00"
    }
  ],
  "speakableResponse": "I apologize, but that slot was just taken. I do have an opening at 4:00 PM on Tuesday. Would that work instead?"
}
```

**Response — Booking disabled:**
```json
{
  "booked": false,
  "reason": "booking_disabled",
  "speakableResponse": "I've noted your preferred time of Tuesday at 3:00 PM. Someone from our team will reach out to confirm your appointment shortly.",
  "meta": {
    "preferred_time_noted": true,
    "campaign_id": "uuid"
  }
}
```

### 4.3 `agent-reschedule-appointment` (Reschedule Tool)

**Method:** POST
**Auth:** Service role key

> **Same design principle as booking:** This endpoint accepts a **structured ISO datetime** for the new time. The agent will have already called `agent-check-availability` to find a new slot, and the lead agreed to it. The new time comes from a `timeISO` value in the availability response.

**Request:**
```json
{
  "appointment_id": "uuid",
  "campaign_id": "uuid",
  "org_id": "uuid",
  "new_scheduled_at": "2026-03-02T10:00:00-05:00",
  "reason": "Client has a conflict",
  "call_metadata": {
    "retell_call_id": "...",
    "call_id": "uuid",
    "agent_id": "uuid"
  }
}
```

**Field notes:**
- `appointment_id` — The existing appointment to reschedule. The agent knows this from prior context (e.g., the lead called in about an existing appointment, or the agent booked it earlier in the same call).
- `new_scheduled_at` — Exact ISO 8601 datetime, from a prior `agent-check-availability` call.
- `campaign_id`, `org_id` — From agent call metadata. Used to resolve calendar connection and validate tenant access.
- `reason` — Optional. Logged on the appointment record for broker visibility.

**Logic flow:**
1. Validate `new_scheduled_at` is a valid ISO datetime
2. Fetch existing appointment, verify it belongs to `org_id` and is not cancelled
3. Resolve campaign context from `campaign_id` (calendar connection, etc.)
4. Re-verify availability at `new_scheduled_at` (race condition check)
5. If available → update appointment record in DB (new `scheduled_at`, log reason)
6. If calendar event exists → update the calendar event (via `calendar-providers.ts`)
7. Fire N8N webhook for downstream (reschedule SMS to lead, notification to broker)
8. Return confirmation with speakable response

**Response — Rescheduled:**
```json
{
  "rescheduled": true,
  "appointment_id": "uuid",
  "old_time": "Tuesday, February 28 at 3:00 PM",
  "oldTimeISO": "2026-02-28T15:00:00-05:00",
  "new_time": "Thursday, March 2 at 10:00 AM",
  "newTimeISO": "2026-03-02T10:00:00-05:00",
  "duration_minutes": 30,
  "calendar_event_updated": true,
  "speakableResponse": "Done! I've moved your appointment to Thursday, March 2nd at 10:00 AM. You'll receive an updated confirmation."
}
```

**Response — New slot taken (race condition):**
```json
{
  "rescheduled": false,
  "reason": "slot_taken",
  "alternatives": [
    {
      "time": "Thursday, March 2 at 11:00 AM",
      "timeISO": "2026-03-02T11:00:00-05:00",
      "endTime": "11:30 AM",
      "endTimeISO": "2026-03-02T11:30:00-05:00"
    }
  ],
  "speakableResponse": "I'm sorry, that slot just became unavailable. I do have 11:00 AM on Thursday. Would that work instead?"
}
```

**Response — Appointment not found:**
```json
{
  "rescheduled": false,
  "reason": "appointment_not_found",
  "speakableResponse": "I wasn't able to find that appointment. Let me take down your preferred time and someone will follow up to get this sorted out."
}
```

### 4.4 `list-calendars` (Dashboard)

**Method:** GET
**Auth:** User JWT
**Query params:** `integration_id`

**Response:**
```json
{
  "calendars": [
    {
      "id": "uuid",
      "provider_calendar_id": "AAMkAGI2TGuLAAA=",
      "calendar_name": "Calendar",
      "provider": "outlook",
      "color": "#0078d4",
      "is_default": true,
      "is_enabled_for_display": true,
      "sync_direction": "read_write",
      "linked_campaigns": ["Campaign A", "Campaign B"]
    }
  ],
  "integration": {
    "id": "uuid",
    "account_email": "broker@company.com",
    "status": "connected",
    "provider": "outlook"
  }
}
```

### 4.5 `calendar-status` (Health Check)

**Method:** GET
**Auth:** User JWT or Service key + `org_id` param
**Query params:** `campaign_id` or `integration_id`

**Response:**
```json
{
  "status": "healthy",
  "provider": "outlook",
  "account_email": "broker@company.com",
  "token_valid": true,
  "token_expires_at": "2026-02-27T20:00:00Z",
  "calendar_accessible": true,
  "last_checked": "2026-02-27T15:00:00Z",
  "issues": []
}
```

Possible `status` values: `healthy`, `needs_reauth`, `token_expired`, `calendar_inaccessible`, `not_connected`

### 4.6 `update-calendar-connection` (Dashboard)

**Method:** PATCH
**Auth:** User JWT

**Request:**
```json
{
  "calendar_connection_id": "uuid",
  "is_enabled_for_display": true,
  "sync_direction": "read_write"
}
```

---

## 5. Outlook / Azure AD Integration

### 5.1 Azure App Registration (Multi-Tenant)

**App type:** Multi-tenant (accounts in any organizational directory + personal Microsoft accounts)
**Platform:** Web
**Redirect URI:** `https://app.courtside-ai.com/api/integrations/outlook/callback`

**Required API Permissions (delegated):**
| Permission | Scope | Why |
|---|---|---|
| `Calendars.ReadWrite` | `https://graph.microsoft.com/Calendars.ReadWrite` | Read free/busy, list calendars, create/update/delete events |
| `User.Read` | `https://graph.microsoft.com/User.Read` | Get account email for display |
| `offline_access` | `offline_access` | Get refresh token for background operations |

**Environment variables to add:**
```env
MICROSOFT_CLIENT_ID=<from Azure portal>
MICROSOFT_CLIENT_SECRET=<from Azure portal>
MICROSOFT_TENANT_ID=common    # "common" for multi-tenant
```

### 5.2 OAuth Flow (Outlook)

```
1. User clicks "Connect Outlook Calendar" in Settings
   ↓
2. Frontend redirects to:
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize
   ?client_id={MICROSOFT_CLIENT_ID}
   &response_type=code
   &redirect_uri={callback_url}
   &scope=https://graph.microsoft.com/Calendars.ReadWrite offline_access User.Read
   &state={user_session_token}
   &prompt=consent
   ↓
3. Microsoft shows consent screen → user approves
   ↓
4. Microsoft redirects to /api/integrations/outlook/callback?code=XXX&state=YYY
   ↓
5. Next.js callback route calls calendar-oauth-callback Edge Function
   (already built — exchanges code, fetches calendars, creates DB rows)
   ↓
6. Redirect back to /settings/integrations?success=outlook
```

**This flow already exists and is working.** The only additions needed are:
- Verify the Azure app registration is configured correctly for multi-tenant
- Ensure the OAuth URL builder in `src/lib/integrations/oauth.ts` uses `prompt=consent` to guarantee refresh token
- Test with a real Outlook account

### 5.3 Microsoft Graph API Endpoints We Use

| Endpoint | Method | Purpose |
|---|---|---|
| `/me/calendars` | GET | List all calendars for the account |
| `/me/calendars/{id}/calendarView` | GET | Get events in a date range (for busy periods) |
| `/me/calendars/{id}/events` | POST | Create a calendar event |
| `/me/calendars/{id}/events/{eventId}` | PATCH | Update an event (reschedule) |
| `/me/calendars/{id}/events/{eventId}` | DELETE | Cancel/delete an event |
| `/me` | GET | Get user profile (email) |

### 5.4 Outlook-Specific Considerations

**CalendarView vs FreeBusy:** Unlike Google which has a dedicated FreeBusy endpoint, Outlook's best approach for availability is the `calendarView` endpoint which returns actual events. We filter to non-cancelled events and extract start/end times. This is already implemented in `getOutlookBusyPeriods()` in `check-availability`.

**Time zones:** Outlook Graph API returns times in UTC by default. We append "Z" to parse as UTC. The `Prefer: outlook.timezone="America/Toronto"` header can be used to get times in a specific timezone, but UTC is simpler for our computation.

**Pagination:** CalendarView can return paginated results for large date ranges. For single-day queries this isn't an issue, but multi-day ranges (for "earliest available") should handle `@odata.nextLink`.

**Rate limits:** Microsoft Graph allows 10,000 requests per 10 minutes per app per tenant. Well within our needs.

---

## 6. Natural Language Date Parsing

### 6.1 New Module: `_shared/date-parser.ts`

Adapted from the reference repo's `date-parser.ts` but enhanced for our needs.

**Dependencies:** `chrono-node` (npm package, works in Deno via npm: specifier)

**Core function signature:**
```typescript
interface ParsedDateTime {
  // The parsed date — null if "earliest available" or unparseable
  date: string | null;           // "2026-02-28" (YYYY-MM-DD)
  time: string | null;           // "14:00" (HH:MM) — null if day-only
  dateTimeISO: string | null;    // "2026-02-28T14:00:00-05:00" — null if no specific time

  // Classification
  confidence: "exact" | "day_only" | "range" | "relative" | "none_requested";

  // For range inputs ("tomorrow morning", "after 4pm")
  rangeStart: string | null;     // "09:00"
  rangeEnd: string | null;       // "12:00"

  // Human-readable version of what was parsed
  speakableTime: string | null;  // "Tuesday, February 28 at 2:00 PM"

  // If we need to search across multiple days
  searchDates: string[];         // ["2026-02-28"] or ["2026-03-01", "2026-03-02", ...]
}

function parseRequestedTime(
  input: string | null | undefined,
  timezone: string,
  referenceDate?: Date,
  maxAdvanceDays?: number
): ParsedDateTime
```

**Parsing strategy (ordered by priority):**

1. **Empty/null/"earliest available"/"as soon as possible"/"ASAP"** → `confidence: "none_requested"`, `searchDates` = next `maxAdvanceDays` business days
2. **"After X" pattern** (regex: `/(?:after|past)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i`) → today (or tomorrow if past), start from parsed time
3. **Time-of-day periods** ("morning" → 9:00-12:00, "afternoon" → 12:00-17:00, "evening" → 17:00-20:00) → `confidence: "range"`
4. **chrono-node parse** for everything else → either exact datetime or day-only
5. **Day-only** (just "Friday" or "March 1st") → `confidence: "day_only"`, search all business hours that day
6. **Fallback** → `confidence: "none_requested"`, search forward from now

**Timezone handling:**
- All parsing happens in the campaign/org timezone (passed as param)
- Uses `Intl.DateTimeFormat` to compute UTC offset
- Output ISO strings include timezone offset (e.g., `-05:00`)
- "today", "tomorrow", "this afternoon" are relative to timezone, not server time

### 6.2 Speech-Friendly Time Formatting

New module: `_shared/speech.ts`

```typescript
// "14:00" → "2:00 PM"
function formatTimeForSpeech(time24: string): string

// "2026-02-28" → "Tuesday, February 28th"
function formatDateForSpeech(dateStr: string, timezone: string): string

// Combines: "Tuesday, February 28th at 2:00 PM"
function formatDateTimeForSpeech(dateStr: string, time24: string, timezone: string): string

// Generate the full speakable sentence for the AI
function generateSpeakableResponse(params: {
  available: boolean;
  requestedTime: string | null;
  alternatives: Array<{ date: string; time: string }>;
  reason?: string;
  isEarliestQuery: boolean;
}): string
```

The `generateSpeakableResponse` function produces natural sentences like:
- "Great news! Tuesday, February 28th at 2:00 PM is available. Shall I book that for you?"
- "Unfortunately, 2:00 PM on Tuesday isn't available. I do have 3:00 PM on Tuesday, 4:30 PM on Tuesday, or 10:00 AM on Wednesday. Would any of those work?"
- "The earliest available is today at 3:30 PM. I also have tomorrow at 9:00 AM or 11:00 AM."

---

## 7. Database Changes

### Migration: `20260228000000_calendar_api_enhancements.sql`

```sql
-- Buffer time per campaign (applied before/after each busy period)
ALTER TABLE campaign_appointment_schedules
  ADD COLUMN IF NOT EXISTS buffer_minutes integer DEFAULT 0;

-- Campaign-level scheduling settings
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS default_meeting_duration integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_advance_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS min_notice_hours integer DEFAULT 2;

-- Track calendar event IDs provider-agnostically
-- (appointments table already has calendar_connection_id and sync_status)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS calendar_event_id text,
  ADD COLUMN IF NOT EXISTS calendar_provider text;

-- Add index for fast appointment lookups by date range
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at_org
  ON appointments (org_id, scheduled_at)
  WHERE status != 'cancelled';
```

---

## 8. Edge Function Implementation Details

### 8.1 `agent-check-availability` — Full Logic

```
1. VALIDATE INPUT
   - campaign_id required
   - requested_time_string optional (null = earliest)

2. RESOLVE CONTEXT
   - Fetch campaign (calendar_connection_id, default_meeting_duration,
     max_advance_days, min_notice_hours, booking_enabled, org_id)
   - Fetch campaign timezone (from org or explicit param)
   - Fetch campaign_appointment_schedules (business hours)

3. PARSE TIME
   - Call parseRequestedTime(requested_time_string, timezone)
   - Get back: date(s) to check, specific time or range, confidence level

4. FOR EACH DATE in parsed.searchDates:
   a. Get day-of-week schedule from campaign_appointment_schedules
   b. Skip if day is disabled
   c. Fetch busy periods from external calendar (Google or Outlook)
      — uses existing getGoogleBusyPeriods / getOutlookBusyPeriods
   d. Fetch Courtside appointments for the date (prevent double-booking)
   e. Apply buffer_minutes to all busy periods
   f. Compute available slots using existing computeAvailableSlots()
   g. Filter: skip slots before "now + min_notice_hours"

5. IF specific time requested:
   a. Check if that exact slot exists in available slots
   b. If yes → return available: true with the slot
   c. If no → find 3 best alternatives (nearest in time to requested)

6. IF no specific time (earliest / day-only / range):
   a. Collect first 3 available slots across all searched dates
   b. For day-only: collect slots within that day only
   c. For range: collect slots within the time range

7. GENERATE RESPONSE
   - Format times for speech
   - Generate speakableResponse sentence
   - Return structured JSON
```

### 8.2 Provider Abstraction: `_shared/calendar-providers.ts`

```typescript
interface CalendarProvider {
  getBusyPeriods(
    accessToken: string,
    calendarId: string,
    dateStart: string,
    dateEnd: string,
    timezone: string
  ): Promise<BusyPeriod[]>;

  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEventInput
  ): Promise<{ eventId: string }>;

  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<void>;

  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;

  listCalendars(
    accessToken: string
  ): Promise<CalendarInfo[]>;
}

// Factory
function getCalendarProvider(provider: "google" | "outlook"): CalendarProvider
```

This abstraction extracts the existing Google/Outlook-specific code from `check-availability` and `calendar-oauth-callback` into a clean interface. When we add Apple Calendar or other providers later, we just implement the interface.

### 8.3 Multi-Day Search Strategy

For "earliest available" or "next week", the agent needs to search multiple days efficiently.

**Strategy:**
1. Batch calendar API calls: fetch busy periods for the full date range in one call (both Google FreeBusy and Outlook CalendarView support ranges)
2. Then compute slots locally for each day
3. Stop as soon as we have 3+ alternatives

**Optimization:** Cache the campaign settings (business hours, buffer, calendar connection) for the duration of the request. These don't change mid-call.

---

## 9. AI Agent Response Format

### Design Principles

1. **`speakableResponse` is the star** — The AI agent can read this verbatim. It's always a complete, natural sentence.
2. **Structured data for logic** — The AI uses `available`, `alternatives`, and ISO times for decision-making (e.g., "should I offer to book?").
3. **`meta` for debugging** — Campaign ID, provider, confidence level. Not spoken, but useful for logging.
4. **Graceful degradation** — Calendar errors produce helpful speakable fallbacks, never crashes.

### Response Field Reference

| Field | Type | Always Present | Description |
|---|---|---|---|
| `available` | `boolean \| null` | Yes | true = slot open, false = slot taken, null = couldn't check |
| `requestedTime` | `string \| null` | Yes | Human-readable requested time, or null if "earliest" |
| `requestedTimeISO` | `string \| null` | Yes | ISO 8601 with timezone offset |
| `endTime` | `string \| null` | If available=true | Human-readable end time |
| `endTimeISO` | `string \| null` | If available=true | ISO end time |
| `duration_minutes` | `number` | Yes | Duration used for slot calculation |
| `timezone` | `string` | Yes | IANA timezone used |
| `alternatives` | `array \| null` | If available≠true | Up to 3 alternative slots |
| `speakableResponse` | `string` | Yes | Natural sentence for AI to read |
| `error` | `string \| null` | If error | Error code for programmatic handling |
| `meta` | `object` | Yes | Debug/context info |

---

## 10. Calendar Event Write Path

### Current Path (N8N-driven, stays as-is for non-agent bookings)
```
Dashboard creates appointment → DB insert
  → N8N detects (webhook/trigger)
  → N8N calls sync-appointment-to-calendar Edge Function
  → Event created in Google/Outlook
  → sync_status updated to "success"
```

### New Path (Agent-driven, for live call bookings)
```
AI agent calls agent-book-appointment with exact ISO time
(from a prior agent-check-availability response) →
  1. Validate scheduled_at ISO datetime (no NLP — deterministic)
  2. Resolve campaign context from campaign_id (calendar, settings)
  3. Re-verify availability at that exact slot (race condition check)
  4. Insert appointment in DB (via create-appointment logic)
     — lead_id, contact_id, org_id all from agent call metadata
  5. Immediately create calendar event (via calendar-providers.ts)
     — Don't wait for N8N; the AI needs confirmation NOW
  6. Update appointment with calendar_event_id + sync_status = "success"
  7. Fire N8N webhook for downstream (confirmation SMS, notifications)
  8. Return to AI with speakable confirmation
```

**Why immediate for agent bookings?** During a live call, the AI tells the lead "You're all set for Tuesday at 2 PM." If the calendar event creation is async via N8N, there's a window where the broker's calendar doesn't reflect the booking, risking double-booking. For agent-initiated bookings, we create the calendar event synchronously.

**Why structured ISO instead of natural language for booking?** The availability check already did the hard work — parsing "Tuesday at 2pm" into precise slots, checking the calendar, and returning validated ISO timestamps. When the lead agrees to a slot, the agent passes back that exact ISO value. Re-parsing natural language during booking would be redundant and risky (e.g., "3 PM" could be ambiguous about which day if the conversation discussed multiple days).

---

## 11. Error Handling & Resilience

### Error Categories

| Category | Handling | AI Response |
|---|---|---|
| **Calendar not connected** | Return immediately with fallback | "Let me take down your preferred time and we'll confirm shortly." |
| **Token expired, refresh fails** | Mark `needs_reauth`, return fallback | Same as above |
| **Calendar API timeout (>3s)** | Retry once, then fallback | Same as above |
| **Calendar API error (5xx)** | Retry once with backoff, then fallback | Same as above |
| **NLP parse failure** | Treat as "earliest available" | "I didn't quite catch a specific time. Here are the next available slots..." |
| **No available slots found** | Search extended range (7 more days) | "The schedule is quite full this week. The next opening I have is..." |
| **Race condition (slot taken during booking)** | Re-check, offer alternatives | "That slot was just taken. I have an opening at..." |
| **Campaign not found** | 404 error | (This shouldn't happen in normal flow) |
| **Invalid campaign_id** | 400 error | (This shouldn't happen in normal flow) |

### Timeout Strategy
- Calendar API calls: 5 second timeout, 1 retry
- Total endpoint response target: <2 seconds for specific time checks, <4 seconds for multi-day searches
- If calendar API is slow, return Courtside-only availability (from appointments table) with a note

### Logging
- All agent-* calls logged to a new `agent_tool_calls` table (for analytics & debugging)
- Fields: `call_id`, `tool_name`, `input`, `output`, `duration_ms`, `calendar_provider`, `error`

---

## 12. Documentation Deliverables

### 12.1 OpenAPI/Swagger Spec

File: `docs/api/openapi.yaml`

Full OpenAPI 3.0 spec covering:
- All agent-* endpoints (request/response schemas, examples)
- All core calendar endpoints
- Authentication methods (JWT vs service key)
- Error response schemas
- Webhook formats (for Retell integration)

### 12.2 Notion Documentation Pages

Organized as a Notion wiki section:

```
📁 Calendar API Documentation
├── 📄 Overview & Architecture
│   ├── Two-layer design explanation
│   ├── Architecture diagram
│   └── When to use which endpoint
├── 📄 Quick Start Guide
│   ├── Connecting Outlook Calendar
│   ├── Connecting Google Calendar
│   ├── Testing availability check
│   └── Configuring business hours
├── 📄 AI Agent Tools Reference
│   ├── agent-check-availability (full docs + examples)
│   ├── agent-book-appointment (full docs + examples)
│   └── agent-reschedule-appointment (full docs + examples)
├── 📄 Core API Reference
│   ├── check-availability
│   ├── create-appointment
│   ├── list-calendars
│   ├── calendar-status
│   └── update-calendar-connection
├── 📄 Natural Language Input Guide
│   ├── Supported input formats
│   ├── Timezone handling
│   └── Edge cases & examples
├── 📄 Response Format Reference
│   ├── All response schemas
│   ├── speakableResponse examples
│   └── Error codes & fallbacks
├── 📄 Outlook Integration Setup
│   ├── Azure AD app registration steps
│   ├── Required permissions
│   ├── OAuth flow walkthrough
│   └── Troubleshooting
└── 📄 Configuration Guide
    ├── Business hours setup
    ├── Buffer time
    ├── Booking policies (max advance, min notice)
    └── Multi-calendar scenarios
```

---

## 13. Implementation Phases

### Phase A: Foundation (Days 1-2) — COMPLETED 2026-02-27
**Goal:** New shared modules + database migration

| Task | File | Status |
|---|---|---|
| Write database migration | `supabase/migrations/20260228000000_calendar_api_enhancements.sql` | Done — applied via MCP, verified columns + index |
| Create `_shared/date-parser.ts` | NLP date parsing module (chrono-node) | Done — 398 lines |
| Create `_shared/speech.ts` | Speech formatting module | Done — 155 lines |
| Create `_shared/calendar-providers.ts` | Provider abstraction (Google + Outlook) | Done — 468 lines |
| Unit test date parser with edge cases | Test file | Deferred |

**Notes:**
- `appointments.calendar_event_id` and `appointments.calendar_provider` already existed — migration skipped those.
- Outlook getBusyPeriods handles `@odata.nextLink` pagination for multi-day queries.
- `date-parser.ts` uses `npm:chrono-node@2.7.7` via Deno npm specifier.

### Phase B: Agent Endpoints (Days 3-5) — COMPLETED 2026-02-27
**Goal:** All three agent-* Edge Functions working

| Task | File | Status |
|---|---|---|
| Build `agent-check-availability` | `supabase/functions/agent-check-availability/index.ts` | Done — ~370 lines, full NLP→slots pipeline |
| Build `agent-book-appointment` | `supabase/functions/agent-book-appointment/index.ts` | Done — ~280 lines, sync calendar event creation |
| Build `agent-reschedule-appointment` | `supabase/functions/agent-reschedule-appointment/index.ts` | Done — ~250 lines, calendar event update |
| Enhance `check-availability` (buffer time, multi-day, past-slot filtering) | Existing file | Done — uses calendar-providers.ts, buffer_minutes, min_notice_hours |

**Notes:**
- All agent-* endpoints use service role key auth (for Retell).
- `agent-check-availability` does batch calendar API fetch for multi-day search, applies buffer_minutes, min_notice_hours filtering.
- `agent-book-appointment` creates calendar events synchronously (not via N8N) for real-time confirmation during calls.
- `agent-book-appointment` auto-updates lead status to `appt_set`.
- `check-availability` (dashboard endpoint) now uses shared `calendar-providers.ts` instead of inline Google/Outlook functions.

### Phase C: Dashboard Endpoints (Day 6) — COMPLETED 2026-02-27
**Goal:** Supporting endpoints for the settings UI

| Task | File | Status |
|---|---|---|
| Build `list-calendars` | `supabase/functions/list-calendars/index.ts` | Done — 110 lines |
| Build `calendar-status` | `supabase/functions/calendar-status/index.ts` | Done — 195 lines |
| Build `update-calendar-connection` | `supabase/functions/update-calendar-connection/index.ts` | Done — 90 lines |

**Notes:**
- `list-calendars`: Returns calendars with linked campaign names via join query.
- `calendar-status`: Full health check — validates token (with auto-refresh), tests calendar API access, returns structured status + issues array.
- `update-calendar-connection`: PATCH for display/sync settings with validation.

### Phase D: Outlook Testing & Hardening (Day 7) — COMPLETED 2026-02-27
**Goal:** End-to-end Outlook flow working

| Task | Details | Status |
|---|---|---|
| Add `prompt=consent` to Outlook OAuth URL | Guarantees refresh_token on every auth | Done |
| Add timeout + retry to calendar API calls | 5s timeout, 1 retry with backoff on 5xx | Done — `fetchWithRetry` in calendar-providers.ts |
| Calendar API timeout fallback | If calendar slow, use Courtside-only availability | Done — already falls through gracefully |
| Verify Azure AD app registration | Ensure multi-tenant, correct scopes | Manual — user to verify |
| Test OAuth flow with real Outlook account | Connect → list calendars → verify tokens | Manual — user to test |
| Test availability check against Outlook calendar | Create events → verify busy | Manual — user to test |
| Test appointment booking with Outlook write-back | Book via agent → verify event | Manual — user to test |
| Test token refresh flow | Wait for expiry → verify auto-refresh | Manual — user to test |

**Code hardening applied:**
- `prompt=consent` added to `src/lib/integrations/oauth.ts` Outlook URL builder
- `fetchWithRetry()` utility in `calendar-providers.ts`: 5s AbortController timeout, 1 retry with 500ms backoff on 5xx errors or network failures
- All 12 calendar API fetch calls (6 Google, 6 Outlook) now use `fetchWithRetry`
- Outlook `getBusyPeriods` pagination loop also uses retry per page
- Agent endpoints gracefully fall back to Courtside-only availability when calendar API fails

### Phase E: Documentation (Days 8-9) — COMPLETED 2026-02-27
**Goal:** Complete API docs

| Task | Format | Status |
|---|---|---|
| Write API reference | `docs/api/calendar-api.md` | Done — comprehensive markdown doc |
| Create Notion documentation pages | Notion wiki | Skipped — covered in markdown |
| Write integration setup guide (Outlook) | Included in API ref Section 6 | Done |
| Write NLP input reference | Included in API ref Section 5 | Done |

**Notes:**
- Created `docs/api/calendar-api.md` instead of OpenAPI YAML — markdown is more readable and maintainable for this project.
- All 7 endpoints fully documented with request/response schemas, examples, and error cases.
- Outlook integration guide, NLP parsing reference, and shared types all included in a single doc.
- Notion pages skipped per user instruction.

### Phase F: Analytics & Monitoring (Day 10)
**Goal:** Observability

| Task | Details | Complexity |
|---|---|---|
| Create `agent_tool_calls` logging table | Migration | Low |
| Add logging to all agent-* endpoints | Code changes | Low |
| Add N8N alert workflow for calendar errors | N8N workflow | Medium |

---

## 14. File Manifest

### New Files

```
supabase/functions/
├── agent-check-availability/index.ts     ← Primary AI tool
├── agent-book-appointment/index.ts       ← Booking AI tool
├── agent-reschedule-appointment/index.ts ← Reschedule AI tool
├── list-calendars/index.ts               ← Dashboard endpoint
├── calendar-status/index.ts              ← Health check endpoint
├── update-calendar-connection/index.ts   ← Dashboard settings
└── _shared/
    ├── date-parser.ts                    ← NLP date parsing
    ├── speech.ts                         ← Speech formatting
    └── calendar-providers.ts             ← Provider abstraction

supabase/migrations/
└── 20260228000000_calendar_api_enhancements.sql

docs/api/
└── openapi.yaml                          ← OpenAPI 3.0 spec
```

### Modified Files

```
supabase/functions/check-availability/index.ts
  → Add buffer time support
  → Add multi-day range support
  → Add past-slot filtering for today
  → Extract provider-specific code to _shared/calendar-providers.ts

supabase/functions/create-appointment/index.ts
  → Add inline calendar event creation option
  → Return richer response with calendar_event_id
```

---

*This plan was designed to be built incrementally — each phase produces working, testable code. Phase A (foundation) and Phase B (agent endpoints) are the critical path. Phases C-F can run in parallel or be deferred.*

---

## 15. Deviations from Plan

The following differences exist between the original plan and the actual implementation (Phases A–D):

1. **Date parser unit tests deferred** — Phase A listed "Unit test date parser with edge cases" but no test file was created. Marked as deferred.

2. **Migration adjusted for existing columns** — The plan's migration included `calendar_event_id` and `calendar_provider` on `appointments`, but those columns already existed in the database. The migration was adjusted to skip them.

3. **Phase D manual testing flagged, not executed** — Phase D was primarily manual Outlook end-to-end testing. Only the code hardening tasks were implemented; manual testing tasks were flagged for the user.

4. **`fetchWithRetry` as reusable utility** — The plan specified "5 second timeout, 1 retry" but didn't prescribe implementation shape. A reusable `fetchWithRetry()` + `fetchWithTimeout()` helper pair was created in `calendar-providers.ts` and applied to all 12 calendar API calls.

5. **`agent_tool_calls` logging table not created** — Section 11 of the plan mentions an analytics/logging table. This belongs to Phase F and was not built.

6. **`create-appointment/index.ts` not modified** — The File Manifest (Section 14) listed modifications to `create-appointment` for inline calendar event creation. Instead, `agent-book-appointment` handles calendar write-back directly, making the `create-appointment` modification unnecessary.

7. **Phase E & F not started** — Documentation (OpenAPI spec, Notion pages) and analytics/monitoring are pending.
