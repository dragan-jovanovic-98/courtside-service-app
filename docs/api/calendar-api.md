  # Courtside AI — Calendar API Reference

  > **Version:** 1.0
  > **Base URL:** `https://xkwywpqrthzownikeill.supabase.co/functions/v1`
  > **Last updated:** 2026-02-27

  ---

  ## Table of Contents

  1. [Overview](#1-overview)
  2. [Authentication](#2-authentication)
  3. [Agent Endpoints (Retell AI)](#3-agent-endpoints-retell-ai)
    - [agent-check-availability](#31-agent-check-availability)
    - [agent-book-appointment](#32-agent-book-appointment)
    - [agent-reschedule-appointment](#33-agent-reschedule-appointment)
  4. [Dashboard Endpoints](#4-dashboard-endpoints)
    - [check-availability](#41-check-availability)
    - [list-calendars](#42-list-calendars)
    - [calendar-status](#43-calendar-status)
    - [update-calendar-connection](#44-update-calendar-connection)
  5. [Natural Language Date Parsing](#5-natural-language-date-parsing)
  6. [Outlook / Azure AD Integration Guide](#6-outlook--azure-ad-integration-guide)
  7. [Error Handling](#7-error-handling)
  8. [Shared Types](#8-shared-types)

  ---

  ## 1. Overview

  ### Two-Layer Architecture

  The Calendar API has two layers serving different consumers:

  ```
  ┌─────────────────────────────────────────────────────┐
  │                    CONSUMERS                         │
  │                                                      │
  │  Retell AI Agent      Dashboard UI      N8N          │
  │  (natural language)   (structured)      (structured) │
  └───────┬────────────────────┬────────────────┬───────┘
          │                    │                │
          ▼                    │                │
  ┌────────────────────┐       │                │
  │  AGENT TOOL LAYER  │       │                │
  │  (NLP, speech)     │       │                │
  │                    │       │                │
  │  agent-check-      │       │                │
  │    availability    │       │                │
  │  agent-book-       │       │                │
  │    appointment     │       │                │
  │  agent-reschedule- │       │                │
  │    appointment     │       │                │
  └────────┬───────────┘       │                │
          │                   │                │
          ▼                   ▼                ▼
  ┌──────────────────────────────────────────────────┐
  │  CORE CALENDAR LAYER                              │
  │  (structured I/O, reusable)                       │
  │                                                    │
  │  check-availability   list-calendars               │
  │  calendar-status      update-calendar-connection   │
  │                                                    │
  │  _shared/calendar-providers.ts  (Google + Outlook) │
  │  _shared/date-parser.ts        (NLP parsing)       │
  │  _shared/speech.ts             (voice formatting)  │
  └──────────────────────────────────────────────────┘
  ```

  **Agent layer** — Called by Retell during live calls. Accepts natural language, returns speech-ready responses. Uses service role key auth.

  **Dashboard/core layer** — Called by the frontend UI and N8N. Accepts structured parameters, returns structured JSON. Uses JWT or service key auth.

  ### Calendar Providers

  Both Google Calendar and Outlook (Microsoft Graph) are supported via a unified `CalendarProvider` interface in `_shared/calendar-providers.ts`. The provider is resolved from the campaign's calendar connection.

  ---

  ## 2. Authentication

  ### Service Role Key (Agent Endpoints)

  Used by Retell AI during live calls. The service role key is passed in the `Authorization` header.

  ```
  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
  ```

  All agent endpoints (`agent-*`) require this auth. The `org_id` is passed in the request body for tenant isolation.

  ### User JWT (Dashboard Endpoints)

  Used by the frontend dashboard. The Supabase auth JWT is passed in the `Authorization` header.

  ```
  Authorization: Bearer <user_jwt>
  ```

  The org is resolved from the JWT via `getAuthContext()`.

  ### Dual Auth (Some Dashboard Endpoints)

  `check-availability` and `calendar-status` accept either:
  - User JWT (dashboard use), or
  - Service role key + `org_id` query param (N8N / internal use)

  ---

  ## 3. Agent Endpoints (Retell AI)

  These endpoints are designed for AI voice agents during live phone calls. They accept natural language input and return `speakableResponse` strings that the AI can read verbatim.

  ### 3.1 `agent-check-availability`

  Check calendar availability with natural language time requests.

  **URL:** `POST /agent-check-availability`
  **Auth:** Service role key
  **Called by:** Retell AI during live calls

  #### Request Body

  ```json
  {
    "campaign_id": "uuid",
    "org_id": "uuid",
    "requested_time_string": "Tuesday at 3pm",
    "lead_id": "uuid",
    "contact_id": "uuid",
    "timezone": "America/Toronto",
    "duration_minutes": 30,
    "call_metadata": {}
  }
  ```

  | Field | Type | Required | Description |
  |---|---|---|---|
  | `campaign_id` | uuid | Yes | Campaign to check availability for |
  | `org_id` | uuid | Yes | Organization ID (tenant isolation) |
  | `requested_time_string` | string | No | Natural language time (e.g., "Tuesday at 3pm", "next week", "ASAP"). Null = earliest available. |
  | `lead_id` | uuid | No | Lead context (for logging) |
  | `contact_id` | uuid | No | Contact context (for logging) |
  | `timezone` | string | No | IANA timezone override. Falls back to campaign -> org -> `America/Toronto` |
  | `duration_minutes` | integer | No | Override meeting duration. Falls back to `campaigns.default_meeting_duration` |
  | `call_metadata` | object | No | Passthrough metadata (retell_call_id, etc.) |

  #### Response — Exact Time Available

  ```json
  {
    "available": true,
    "requestedTime": "Tuesday, February 28 at 3:00 PM",
    "requestedTimeISO": "2026-02-28T15:00:00-05:00",
    "endTime": "3:30 PM",
    "endTimeISO": "2026-02-28T15:30:00-05:00",
    "duration_minutes": 30,
    "timezone": "America/Toronto",
    "alternatives": null,
    "speakableResponse": "Great news! Tuesday, February 28th at 3:00 PM is available. Shall I book that for you?",
    "meta": {
      "campaign_id": "uuid",
      "calendar_provider": "google",
      "slots_checked": 12,
      "parse_confidence": "exact"
    }
  }
  ```

  #### Response — Time Not Available (with Alternatives)

  ```json
  {
    "available": false,
    "requestedTime": "Tuesday, February 28 at 3:00 PM",
    "requestedTimeISO": "2026-02-28T15:00:00-05:00",
    "duration_minutes": 30,
    "timezone": "America/Toronto",
    "alternatives": [
      {
        "time": "Tuesday, February 28 at 4:00 PM",
        "timeISO": "2026-02-28T16:00:00-05:00",
        "endTime": "4:30 PM",
        "endTimeISO": "2026-02-28T16:30:00-05:00"
      },
      {
        "time": "Wednesday, March 1 at 9:00 AM",
        "timeISO": "2026-03-01T09:00:00-05:00",
        "endTime": "9:30 AM",
        "endTimeISO": "2026-03-01T09:30:00-05:00"
      }
    ],
    "speakableResponse": "Unfortunately, 3:00 PM on Tuesday isn't available. I do have 4:00 PM on Tuesday or 9:00 AM on Wednesday. Would either of those work?",
    "meta": {
      "campaign_id": "uuid",
      "calendar_provider": "outlook",
      "slots_checked": 24,
      "parse_confidence": "exact"
    }
  }
  ```

  #### Response — Earliest Available (No Time Specified)

  ```json
  {
    "available": false,
    "requestedTime": null,
    "requestedTimeISO": null,
    "duration_minutes": 30,
    "timezone": "America/Toronto",
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

  #### Response — Day Not Available

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

  #### Response — Calendar Auth Expired

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

  #### Response — Calendar Not Connected

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

  #### Parse Confidence Values

  | Value | Meaning | Example Input |
  |---|---|---|
  | `exact` | Specific date and time parsed | "Tuesday at 3pm" |
  | `day_only` | Date parsed, no specific time | "Friday", "March 1st" |
  | `range` | Time range parsed | "tomorrow morning", "after 4pm" |
  | `none_requested` | No time given or "earliest"/"ASAP" | null, "earliest available", "as soon as possible" |

  ---

  ### 3.2 `agent-book-appointment`

  Book an appointment at a specific time. Accepts structured ISO datetime (from a prior `agent-check-availability` response), NOT natural language.

  **URL:** `POST /agent-book-appointment`
  **Auth:** Service role key
  **Called by:** Retell AI during live calls

  #### Request Body

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

  | Field | Type | Required | Description |
  |---|---|---|---|
  | `campaign_id` | uuid | Yes | Campaign context |
  | `lead_id` | uuid | Yes | Lead to book for |
  | `contact_id` | uuid | Yes | Contact record |
  | `org_id` | uuid | Yes | Tenant isolation |
  | `scheduled_at` | string | Yes | ISO 8601 datetime with timezone offset. Use a `timeISO` value from `agent-check-availability`. |
  | `duration_minutes` | integer | No | Override duration. Falls back to `campaigns.default_meeting_duration` |
  | `notes` | string | No | Conversation context from the AI |
  | `call_metadata` | object | No | If `call_metadata.call_id` is provided, stored on the appointment |

  #### Response — Booked

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

  #### Response — Booking Disabled

  When `campaigns.booking_enabled` is false, the preferred time is noted but no appointment is created.

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

  #### Response — Slot Taken (Race Condition)

  If the slot was booked between the availability check and this booking call.

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

  #### Side Effects

  1. Inserts row into `appointments` table
  2. Updates `leads.status` to `appt_set`
  3. Creates calendar event synchronously (Google/Outlook) if calendar is connected
  4. Fires N8N webhook: `POST {N8N_WEBHOOK_BASE_URL}/appointment-created`

  ---

  ### 3.3 `agent-reschedule-appointment`

  Reschedule an existing appointment to a new time.

  **URL:** `POST /agent-reschedule-appointment`
  **Auth:** Service role key
  **Called by:** Retell AI during live calls

  #### Request Body

  ```json
  {
    "appointment_id": "uuid",
    "campaign_id": "uuid",
    "org_id": "uuid",
    "new_scheduled_at": "2026-03-05T10:00:00-05:00",
    "reason": "Client has a conflict",
    "call_metadata": {
      "retell_call_id": "...",
      "call_id": "uuid",
      "agent_id": "uuid"
    }
  }
  ```

  | Field | Type | Required | Description |
  |---|---|---|---|
  | `appointment_id` | uuid | Yes | Existing appointment to reschedule |
  | `campaign_id` | uuid | Yes | Campaign context (for calendar resolution) |
  | `org_id` | uuid | Yes | Tenant isolation |
  | `new_scheduled_at` | string | Yes | ISO 8601 datetime. Use a `timeISO` value from `agent-check-availability`. |
  | `reason` | string | No | Appended to appointment notes |
  | `call_metadata` | object | No | Passthrough to N8N webhook |

  #### Response — Rescheduled

  ```json
  {
    "rescheduled": true,
    "appointment_id": "uuid",
    "old_time": "Tuesday, February 28 at 3:00 PM",
    "oldTimeISO": "2026-02-28T15:00:00-05:00",
    "new_time": "Thursday, March 5 at 10:00 AM",
    "newTimeISO": "2026-03-05T10:00:00-05:00",
    "duration_minutes": 30,
    "calendar_event_updated": true,
    "speakableResponse": "Done! I've moved your appointment to Thursday, March 5th at 10:00 AM. You'll receive an updated confirmation."
  }
  ```

  #### Response — Appointment Not Found

  ```json
  {
    "rescheduled": false,
    "reason": "appointment_not_found",
    "speakableResponse": "I wasn't able to find that appointment. Let me take down your preferred time and someone will follow up to get this sorted out."
  }
  ```

  #### Response — Appointment Cancelled

  ```json
  {
    "rescheduled": false,
    "reason": "appointment_cancelled",
    "speakableResponse": "That appointment has been cancelled. Would you like to book a new one?"
  }
  ```

  #### Response — Slot Taken

  ```json
  {
    "rescheduled": false,
    "reason": "slot_taken",
    "alternatives": [
      {
        "time": "Thursday, March 5 at 11:00 AM",
        "timeISO": "2026-03-05T11:00:00-05:00",
        "endTime": "11:30 AM",
        "endTimeISO": "2026-03-05T11:30:00-05:00"
      }
    ],
    "speakableResponse": "I'm sorry, that slot just became unavailable. I do have 11:00 AM on Thursday. Would that work instead?"
  }
  ```

  #### Side Effects

  1. Updates `appointments` row (new `scheduled_at`, appends reason to notes)
  2. Updates linked calendar event (Google/Outlook) if one exists
  3. Fires N8N webhook: `POST {N8N_WEBHOOK_BASE_URL}/appointment-rescheduled`

  ---

  ## 4. Dashboard Endpoints

  These endpoints serve the frontend UI and N8N workflows. They use structured parameters and return structured JSON.

  ### 4.1 `check-availability`

  Get available time slots for a specific date.

  **URL:** `GET /check-availability`
  **Auth:** User JWT or service key + `org_id` param

  #### Query Parameters

  | Param | Type | Required | Description |
  |---|---|---|---|
  | `date` | string | Yes | `YYYY-MM-DD` format |
  | `campaign_id` | uuid | Yes | Campaign to check |
  | `duration` | integer | No | Minutes (15–240). Default: 30 |
  | `timezone` | string | No | IANA timezone. Default: `America/Toronto` |
  | `org_id` | uuid | Only with service key | Tenant isolation for non-JWT auth |

  #### Response

  ```json
  {
    "date": "2026-02-28",
    "available_slots": [
      { "start": "09:00", "end": "09:30" },
      { "start": "09:30", "end": "10:00" },
      { "start": "10:00", "end": "10:30" },
      { "start": "14:00", "end": "14:30" },
      { "start": "14:30", "end": "15:00" }
    ],
    "timezone": "America/Toronto"
  }
  ```

  #### Slot Computation Logic

  1. Fetch business hours from `campaign_appointment_schedules` for the day of week
  2. Fetch external calendar busy periods (Google/Outlook) via `calendar-providers.ts`
  3. Fetch Courtside appointments for the date (prevent double-booking)
  4. Apply `buffer_minutes` to all busy periods (expand on both sides)
  5. Compute available slots by removing busy periods from business hours
  6. Filter out slots before `now + min_notice_hours` (for today's date)

  ---

  ### 4.2 `list-calendars`

  List calendars for a connected integration, with linked campaign info.

  **URL:** `GET /list-calendars`
  **Auth:** User JWT only

  #### Query Parameters

  | Param | Type | Required | Description |
  |---|---|---|---|
  | `integration_id` | uuid | Yes | The calendar integration to list calendars for |

  #### Response

  ```json
  {
    "calendars": [
      {
        "id": "uuid",
        "provider_calendar_id": "primary",
        "calendar_name": "My Calendar",
        "provider": "google",
        "color": "#3788d8",
        "is_default": true,
        "is_enabled_for_display": true,
        "sync_direction": "read_write",
        "linked_campaigns": ["Refinance Q1", "New Leads Campaign"]
      }
    ],
    "integration": {
      "id": "uuid",
      "account_email": "user@example.com",
      "status": "connected",
      "provider": "google"
    }
  }
  ```

  ---

  ### 4.3 `calendar-status`

  Health check for a calendar integration. Validates token, tests API access.

  **URL:** `GET /calendar-status`
  **Auth:** User JWT or service key + `org_id` param

  #### Query Parameters (one of `campaign_id` or `integration_id` required)

  | Param | Type | Required | Description |
  |---|---|---|---|
  | `campaign_id` | uuid | One of these | Resolves via campaign -> calendar_connection -> integration |
  | `integration_id` | uuid | One of these | Direct integration lookup |
  | `org_id` | uuid | Only with service key | Tenant isolation for non-JWT auth |

  #### Response

  ```json
  {
    "status": "healthy",
    "provider": "outlook",
    "account_email": "user@example.com",
    "token_valid": true,
    "token_expires_at": "2026-03-01T12:00:00Z",
    "calendar_accessible": true,
    "last_checked": "2026-02-27T10:00:00Z",
    "issues": []
  }
  ```

  #### Status Values

  | Status | Meaning |
  |---|---|
  | `healthy` | Token valid, calendars accessible |
  | `needs_reauth` | Integration flagged as `needs_reauth` in database |
  | `token_expired` | Could not obtain a valid access token (refresh failed) |
  | `calendar_inaccessible` | Token valid but calendar API returned no calendars |
  | `not_connected` | No integration or calendar connection found |

  ---

  ### 4.4 `update-calendar-connection`

  Update display and sync settings for a calendar connection.

  **URL:** `PATCH /update-calendar-connection`
  **Auth:** User JWT only

  #### Request Body

  ```json
  {
    "calendar_connection_id": "uuid",
    "is_enabled_for_display": true,
    "sync_direction": "read_write"
  }
  ```

  | Field | Type | Required | Description |
  |---|---|---|---|
  | `calendar_connection_id` | uuid | Yes | The connection to update |
  | `is_enabled_for_display` | boolean | No | Show/hide this calendar in the dashboard |
  | `sync_direction` | string | No | One of: `none`, `read`, `write`, `read_write` |

  At least one of `is_enabled_for_display` or `sync_direction` must be provided.

  #### Response

  ```json
  {
    "success": true,
    "updated": {
      "is_enabled_for_display": true,
      "sync_direction": "read_write"
    }
  }
  ```

  #### Errors

  | Status | Message |
  |---|---|
  | 400 | `No fields to update` |
  | 400 | `Invalid sync_direction. Must be one of: none, read, write, read_write` |
  | 404 | `Calendar connection not found` |

  ---

  ## 5. Natural Language Date Parsing

  The `_shared/date-parser.ts` module powers natural language time input for `agent-check-availability`.

  ### Supported Input Patterns

  | Input | Parsed As | Confidence |
  |---|---|---|
  | `null`, `""`, `"earliest available"`, `"ASAP"`, `"as soon as possible"` | Search next N business days | `none_requested` |
  | `"Tuesday at 3pm"`, `"February 28 at 15:00"` | Exact date + time | `exact` |
  | `"Friday"`, `"March 1st"`, `"next Monday"` | Specific day, all business hours | `day_only` |
  | `"tomorrow morning"` | Tomorrow 9:00–12:00 | `range` |
  | `"this afternoon"` | Today 12:00–17:00 | `range` |
  | `"tomorrow evening"` | Tomorrow 17:00–20:00 | `range` |
  | `"after 4pm"`, `"past 2:30"` | Today/tomorrow from that time | `range` |
  | `"before 11am"` | Today/tomorrow until that time | `range` |
  | `"next week"` | Next Mon–Fri, all business hours | `range` |

  ### Time-of-Day Ranges

  | Period | Start | End |
  |---|---|---|
  | Morning | 09:00 | 12:00 |
  | Afternoon | 12:00 | 17:00 |
  | Evening | 17:00 | 20:00 |

  ### Configuration

  | Parameter | Default | Description |
  |---|---|---|
  | `timezone` | Required | IANA timezone (e.g., `America/Toronto`) |
  | `referenceDate` | `new Date()` | Base date for relative parsing |
  | `maxAdvanceDays` | 14 | How far forward to search for "earliest available" |

  ### `ParsedDateTime` Output

  ```typescript
  interface ParsedDateTime {
    date: string | null;            // "2026-02-28" (YYYY-MM-DD)
    time: string | null;            // "14:00" (HH:MM) — null if day-only
    dateTimeISO: string | null;     // "2026-02-28T14:00:00-05:00"
    confidence: "exact" | "day_only" | "range" | "relative" | "none_requested";
    rangeStart: string | null;      // "09:00" — for range queries
    rangeEnd: string | null;        // "12:00"
    speakableTime: string | null;   // "Tuesday, February 28 at 2:00 PM"
    searchDates: string[];          // ["2026-02-28"] or multi-day array
  }
  ```

  ---

  ## 6. Outlook / Azure AD Integration Guide

  ### Azure App Registration

  | Setting | Value |
  |---|---|
  | **App type** | Multi-tenant |
  | **Platform** | Web |
  | **Redirect URI** | `https://services.court-side.ai/api/integrations/outlook/callback` |

  ### Required API Permissions (Delegated)

  | Permission | Scope | Purpose |
  |---|---|---|
  | `Calendars.ReadWrite` | `https://graph.microsoft.com/Calendars.ReadWrite` | Read busy periods, list calendars, create/update/delete events |
  | `User.Read` | `https://graph.microsoft.com/User.Read` | Get account email for display |
  | `offline_access` | `offline_access` | Refresh token for background operations |

  ### Environment Variables

  ```env
  NEXT_PUBLIC_MICROSOFT_CLIENT_ID=<from Azure portal>
  MICROSOFT_CLIENT_SECRET=<from Azure portal>
  ```

  ### OAuth Flow

  1. User clicks "Connect Outlook Calendar" in Settings > Integrations
  2. Frontend redirects to Microsoft authorization URL with `prompt=consent`
  3. User approves consent screen
  4. Microsoft redirects to `/api/integrations/outlook/callback?code=XXX`
  5. Next.js route calls `calendar-oauth-callback` Edge Function (exchanges code, fetches calendars, creates DB rows)
  6. Redirect back to `/settings/integrations?success=outlook`

  ### Microsoft Graph API Endpoints Used

  | Endpoint | Method | Purpose |
  |---|---|---|
  | `/me/calendars` | GET | List all calendars |
  | `/me/calendars/{id}/calendarView` | GET | Get events in date range (busy periods) |
  | `/me/calendars/{id}/events` | POST | Create calendar event |
  | `/me/calendars/{id}/events/{eventId}` | PATCH | Update event (reschedule) |
  | `/me/calendars/{id}/events/{eventId}` | DELETE | Cancel/delete event |
  | `/me` | GET | Get user profile (email) |

  ### Outlook-Specific Notes

  - **CalendarView vs FreeBusy:** Outlook uses `calendarView` (returns actual events) instead of a dedicated FreeBusy endpoint like Google. We filter non-cancelled events and extract start/end times.
  - **Time zones:** Graph API returns UTC by default. We append "Z" to parse as UTC.
  - **Pagination:** `calendarView` returns paginated results for large date ranges. The implementation handles `@odata.nextLink` for multi-day queries.
  - **Rate limits:** 10,000 requests per 10 minutes per app per tenant.

  ---

  ## 7. Error Handling

  ### Error Categories

  | Category | Handling | AI Fallback Response |
  |---|---|---|
  | Calendar not connected | Return immediately | "Let me take down your preferred time and we'll confirm shortly." |
  | Token expired, refresh fails | Mark `needs_reauth`, return fallback | Same as above |
  | Calendar API timeout (>5s) | Retry once, then fallback | Same as above |
  | Calendar API 5xx error | Retry once with 500ms backoff, then fallback | Same as above |
  | NLP parse failure | Treat as "earliest available" | "I didn't catch a specific time. Here are the next available slots..." |
  | No slots found | Search extended range | "The schedule is quite full. The next opening I have is..." |
  | Race condition (slot taken) | Re-check, offer alternatives | "That slot was just taken. I have an opening at..." |

  ### Timeout & Retry Strategy

  All calendar API calls use `fetchWithRetry()`:

  - **Timeout:** 5 seconds per request (AbortController)
  - **Retries:** 1 retry on 5xx errors or network failures
  - **Backoff:** 500ms before retry
  - **Fallback:** If calendar API fails completely, agent endpoints fall through gracefully with a manual-confirmation response

  ### HTTP Error Responses

  All endpoints return standard error format:

  ```json
  {
    "error": "Error message here"
  }
  ```

  | Status | Meaning |
  |---|---|
  | 400 | Bad request (missing required fields, invalid values) |
  | 401 | Unauthorized (invalid/missing auth) |
  | 404 | Resource not found |
  | 405 | Method not allowed |
  | 500 | Internal server error |

  ---

  ## 8. Shared Types

  ### `CalendarProvider` Interface

  ```typescript
  interface CalendarProvider {
    getBusyPeriods(
      accessToken: string,
      calendarId: string,
      dateStart: string,   // YYYY-MM-DD
      dateEnd: string,     // YYYY-MM-DD
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
  ```

  ### `BusyPeriod`

  ```typescript
  interface BusyPeriod {
    start: Date;
    end: Date;
  }
  ```

  ### `CalendarEventInput`

  ```typescript
  interface CalendarEventInput {
    summary: string;
    description?: string;
    startDateTime: string;   // ISO 8601
    endDateTime: string;     // ISO 8601
    timezone: string;        // IANA timezone
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
  }
  ```

  ### `CalendarInfo`

  ```typescript
  interface CalendarInfo {
    id: string;
    name: string;
    color: string;
    isDefault: boolean;
  }
  ```

  ### Database Columns Added

  **`campaign_appointment_schedules`:**
  | Column | Type | Default | Description |
  |---|---|---|---|
  | `buffer_minutes` | integer | 0 | Minutes of buffer before/after each busy period |

  **`campaigns`:**
  | Column | Type | Default | Description |
  |---|---|---|---|
  | `default_meeting_duration` | integer | 30 | Default appointment duration in minutes |
  | `booking_enabled` | boolean | true | Whether AI can auto-book (false = note preferred time only) |
  | `max_advance_days` | integer | 14 | How far ahead availability is offered |
  | `min_notice_hours` | integer | 2 | Minimum hours from now for bookable slots |

  **`appointments`:**
  | Column | Type | Description |
  |---|---|---|
  | `calendar_event_id` | text | External calendar event ID (Google/Outlook) |
  | `calendar_provider` | text | `google` or `outlook` |

  **Index:**
  ```sql
  idx_appointments_scheduled_at_org ON appointments (org_id, scheduled_at) WHERE status != 'cancelled'
  ```

  ### New Table: `agent_tool_calls`

  Logging table for all agent-* endpoint invocations (analytics & debugging).

  | Column | Type | Description |
  |---|---|---|
  | `id` | uuid (PK) | Auto-generated |
  | `org_id` | uuid (FK) | Organization (tenant isolation) |
  | `call_id` | uuid (FK, nullable) | Linked call record |
  | `campaign_id` | uuid (FK, nullable) | Campaign context |
  | `lead_id` | uuid (FK, nullable) | Lead context |
  | `tool_name` | text | Endpoint name (e.g., `agent-check-availability`) |
  | `input` | jsonb | Request summary (campaign_id, requested_time, etc.) |
  | `output` | jsonb | Response summary (available, booked, error code, etc.) |
  | `duration_ms` | integer | Endpoint execution time |
  | `calendar_provider` | text (nullable) | `google`, `outlook`, or null |
  | `error` | text (nullable) | Error message if the call failed |
  | `created_at` | timestamptz | Timestamp |

  **Indexes:**
  - `idx_agent_tool_calls_org_created` — org_id + created_at DESC (analytics)
  - `idx_agent_tool_calls_call` — call_id WHERE NOT NULL (debugging)
  - `idx_agent_tool_calls_errors` — org_id + created_at DESC WHERE error IS NOT NULL (monitoring)

  ---

  ## Auth Summary Table

  | Endpoint | Method | Auth | Called By |
  |---|---|---|---|
  | `agent-check-availability` | POST | Service role key | Retell AI (live call) |
  | `agent-book-appointment` | POST | Service role key | Retell AI (live call) |
  | `agent-reschedule-appointment` | POST | Service role key | Retell AI (live call) |
  | `check-availability` | GET | JWT or service key + org_id | Dashboard / N8N |
  | `list-calendars` | GET | JWT | Dashboard |
  | `calendar-status` | GET | JWT or service key + org_id | Dashboard / N8N |
  | `update-calendar-connection` | PATCH | JWT | Dashboard |
