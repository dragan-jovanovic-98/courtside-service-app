# E2E Manual Test Checklist

> Phase 9.1 — Courtside AI QA guide covering the 6 critical end-to-end flows.
> Each item traces through actual UI pages, server actions, edge functions, and webhooks.

---

## Prerequisites

### Environment Variables

Ensure `.env.local` has all required values:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_AUTH_TOKEN
N8N_WEBHOOK_BASE_URL
RETELL_API_KEY
```

### Seed Data

Run the seed script to populate demo data (requires a signed-up user first):

```bash
npx tsx scripts/seed.ts
```

This creates: 1 org ("Apex Mortgage Group"), 2 agents, 3 campaigns, 30 contacts, 30 leads, 24 calls, 5 appointments, 6 action items, and 4 notifications.

### External Services

- **Supabase** project running (ref: `xkwywpqrthzownikeill`)
- **N8N** instance reachable at `N8N_WEBHOOK_BASE_URL`
- **Stripe CLI** installed for webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- **ngrok** or similar for Twilio webhook testing (or use curl locally)

---

## 1. Signup Flow

**Pages:** `/signup` → `/dashboard`
**Backend:** `src/lib/actions/auth.ts` → Supabase Auth

| # | Step | Expected Result | Pass |
|---|---|---|---|
| 1.1 | Navigate to `/signup` | Form renders with fields: First Name, Last Name, Organization Name, Email, Password | [ ] |
| 1.2 | Submit with all fields empty | Validation prevents submission (required fields) | [ ] |
| 1.3 | Submit with valid data: first name, last name, org name, email, password (8+ chars) | "Creating account…" loading state appears, then redirect to `/dashboard` | [ ] |
| 1.4 | Verify empty dashboard | Stat cards show 0 values, no campaigns listed, no action items | [ ] |
| 1.5 | Verify sidebar | Org name displayed, user initials shown in avatar area | [ ] |
| 1.6 | Submit with an already-registered email | Error message displayed inline above the submit button | [ ] |
| 1.7 | Submit with password shorter than 8 characters | Error message about password requirements | [ ] |
| 1.8 | Submit with missing org name | Form does not submit / error displayed | [ ] |
| 1.9 | Click "Sign in" link at bottom of form | Navigates to `/login` | [ ] |

---

## 2. Campaign Creation Flow

**Pages:** `/campaigns/new` (4-step wizard) → `/campaigns`
**Backend:** Edge functions `create-campaign`, `import-leads`, `update-campaign-status`

### Sample CSV for Testing

Save as `test-leads.csv`:

```csv
first_name,last_name,phone,email,company,source
John,Smith,4165551234,john@example.com,Acme Corp,website
Jane,Doe,6475559876,jane@example.com,,referral
Bob,Wilson,4165550000,bob@test.com,Wilson Inc,cold
```

| # | Step | Expected Result | Pass |
|---|---|---|---|
| 2.1 | Navigate to `/campaigns/new` | Wizard renders at Step 1 "Select Agent" with progress indicator showing 4 steps | [ ] |
| **Step 1 — Select Agent** | | | |
| 2.2 | Verify agents list loads from database | Active agents displayed with name, tag badge, and description | [ ] |
| 2.3 | Click "Continue" without selecting an agent | Button is disabled (cannot proceed) | [ ] |
| 2.4 | Click an agent card | Card highlights as selected, "Continue" button becomes enabled | [ ] |
| 2.5 | Click "Continue" | Advances to Step 2 "Add Leads" | [ ] |
| **Step 2 — Add Leads** | | | |
| 2.6 | Verify campaign name input and CSV upload area | Text input and drag-and-drop zone visible | [ ] |
| 2.7 | Click "Continue" without entering a campaign name | Button is disabled | [ ] |
| 2.8 | Enter campaign name, drag-and-drop `test-leads.csv` | File accepted, row count displayed (e.g., "3 rows"), X button to clear | [ ] |
| 2.9 | Click "Continue" | Advances to Step 3 "Schedule" | [ ] |
| **Step 3 — Schedule** | | | |
| 2.10 | Verify schedule defaults | Mon/Tue/Thu/Fri/Sat toggled on, Sun off; daily limit 150; retries 2; timezone America/Toronto | [ ] |
| 2.11 | Toggle a day off/on | Day toggle reflects change, time slots appear/disappear accordingly | [ ] |
| 2.12 | Add a time slot to a day | New start→end pair appears | [ ] |
| 2.13 | Remove a time slot | Slot removed from the day | [ ] |
| 2.14 | Change daily limit, retries, timezone | Values update in form state | [ ] |
| 2.15 | Click "Continue" | Advances to Step 4 "Review" | [ ] |
| **Step 4 — Review** | | | |
| 2.16 | Verify review summary | Shows: campaign name, agent name, lead count (3), schedule days, limit, retries, timezone | [ ] |
| 2.17 | Click "Save Draft" | Campaign created with status `draft`, redirects to `/campaigns` | [ ] |
| 2.18 | Verify campaign on `/campaigns` | Campaign listed with "Draft" badge, correct name and lead count | [ ] |
| 2.19 | Repeat wizard, click "Save & Activate" instead | Campaign created with status `active`, appears with "Active" badge | [ ] |
| 2.20 | Navigate to `/leads` | Imported leads visible with correct names, phones, campaign association | [ ] |
| **Campaign List Actions** | | | |
| 2.21 | On `/campaigns`, click pause/play button on an active campaign | Campaign status toggles between `active` and `paused` | [ ] |

---

## 3. Call Simulation Flow

**Pages:** `/calls`, `/dashboard`
**Backend:** Edge function `initiate-call`, N8N workflow `retell-post-call-outbound`

### Prerequisites
- At least one active agent with a `retell_agent_id` set in the database
- At least one active campaign with leads in `new` or `contacted` status

### Sample Post-Call Webhook Payload

POST to `{N8N_WEBHOOK_BASE_URL}/webhook/services/retell-post-call-outbound`:

```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "call_test_001",
    "agent_id": "agent_xxx",
    "call_type": "phone_call",
    "call_status": "ended",
    "direction": "outbound",
    "from_number": "+18777662137",
    "to_number": "+14165551234",
    "start_timestamp": 1740000000000,
    "end_timestamp": 1740000180000,
    "duration_ms": 180000,
    "recording_url": "https://example.com/recording.wav",
    "transcript": "Agent: Hi, this is Sarah from Apex Mortgage. Am I speaking with John?\nUser: Yes, this is John.\nAgent: Great! I wanted to discuss some refinancing options...",
    "transcript_object": [],
    "disconnection_reason": "agent_hangup",
    "call_analysis": {
      "call_summary": "Discussed refinancing options with John Smith. He expressed strong interest in a 5-year fixed rate. Booked appointment for Thursday at 2pm.",
      "custom_analysis_data": {
        "outcome": "booked",
        "sentiment": "positive",
        "engagement_level": "high",
        "outcome_confidence": 0.95,
        "summary_one_line": "Booked refinancing consultation for Thursday 2pm",
        "financial_details": {
          "current_mortgage_amount": 450000,
          "property_value": 650000,
          "interest_rate_current": 5.2
        },
        "objections": [],
        "topics_discussed": ["refinancing", "fixed rate", "closing costs"],
        "follow_up": {
          "appointment_date": "2026-02-26T14:00:00-05:00",
          "callback_requested": false,
          "documents_to_send": ["rate comparison sheet"]
        },
        "compliance_flags": []
      }
    },
    "call_cost": {
      "combined_cost": 45
    },
    "metadata": {
      "lead_id": "<REPLACE_WITH_REAL_LEAD_UUID>",
      "campaign_id": "<REPLACE_WITH_REAL_CAMPAIGN_UUID>",
      "org_id": "<REPLACE_WITH_REAL_ORG_UUID>",
      "contact_id": "<REPLACE_WITH_REAL_CONTACT_UUID>"
    },
    "retell_llm_dynamic_variables": {
      "first_name": "John"
    },
    "latency": {
      "e2e": {
        "p50": 850
      }
    }
  }
}
```

> **Note:** Replace the UUIDs in `metadata` with real values from your seeded database. Query them with:
> ```sql
> SELECT l.id as lead_id, l.campaign_id, l.contact_id, c.org_id
> FROM leads l JOIN contacts c ON l.contact_id = c.id
> WHERE l.status = 'new' LIMIT 1;
> ```

| # | Step | Expected Result | Pass |
|---|---|---|---|
| **Initiate Call** | | | |
| 3.1 | Navigate to `/calendar`, click a seeded appointment | Detail panel opens with contact name, time, campaign, summary | [ ] |
| 3.2 | Click "Call Now" button | Edge function `initiate-call` fires. Check Supabase function logs or Retell dashboard for the API call | [ ] |
| 3.3 | If Retell is not configured, verify error | Alert shown with error message (agent missing `retell_agent_id` or similar) | [ ] |
| **Simulate Post-Call (via N8N)** | | | |
| 3.4 | Send the sample payload above to N8N webhook endpoint | N8N workflow executes successfully (check N8N execution log) | [ ] |
| 3.5 | Navigate to `/calls` | New call appears with outcome "Booked", one-line summary, duration ~3 min | [ ] |
| 3.6 | Click the call row | Call detail shows full AI summary, transcript excerpt, sentiment, engagement level | [ ] |
| 3.7 | Navigate to `/leads` | Lead status updated (e.g., `appt_set` for a "booked" outcome) | [ ] |
| 3.8 | Navigate to `/dashboard` | Action item created if outcome warrants it (hot_lead for "interested", callback_request for "callback") | [ ] |
| 3.9 | Click "Resolve" on an action item | Item marked as resolved, disappears from unresolved list | [ ] |
| **Outcome Variations** | | | |
| 3.10 | Repeat 3.4 with `"outcome": "interested"` | Lead updated to `interested`, `hot_lead` action item created, broker notified | [ ] |
| 3.11 | Repeat 3.4 with `"outcome": "callback"` | `callback_request` action item created with follow-up details | [ ] |
| 3.12 | Repeat 3.4 with `"outcome": "voicemail"` | Call logged, lead updated, no action item created | [ ] |
| 3.13 | Repeat 3.4 with `"outcome": "dnc"` | Contact marked `is_dnc`, all active leads set to `bad_lead`, `dnc_list` entry created | [ ] |

---

## 4. Appointment Flow

**Pages:** `/calendar`
**Backend:** Edge functions `reschedule-appointment`, `cancel-appointment`, `initiate-call`

| # | Step | Expected Result | Pass |
|---|---|---|---|
| 4.1 | Navigate to `/calendar` | Monthly grid renders with current month, today highlighted | [ ] |
| 4.2 | Verify seeded appointments | Dots/indicators on appointment dates; "Upcoming This Week" list shows upcoming appointments | [ ] |
| 4.3 | Verify stats bar | 4 stat tiles: Today, This Week, This Month, Show Rate — with correct counts from seed data | [ ] |
| 4.4 | Click an appointment (dot on calendar or list item) | Right-side detail panel opens showing: contact name, company, time, duration, phone, campaign name, AI summary | [ ] |
| **Reschedule** | | | |
| 4.5 | Click "Reschedule" button | Reschedule mode activates with `datetime-local` input pre-filled with current `scheduled_at` | [ ] |
| 4.6 | Pick a new date/time, click "Confirm" | `reschedule-appointment` edge function called. Panel closes, calendar refreshes, appointment moves to new date | [ ] |
| 4.7 | Verify the appointment at the new time | Click the new date — appointment appears at updated time | [ ] |
| **Cancel** | | | |
| 4.8 | Click "Cancel Appointment" on an appointment | Browser confirmation dialog appears | [ ] |
| 4.9 | Confirm cancellation | `cancel-appointment` edge function called. Panel closes, appointment removed from calendar view | [ ] |
| **Call Now** | | | |
| 4.10 | Click "Call Now" on an appointment | `initiate-call` edge function called with correct `agent_id`, `lead_id`, `contact_id` | [ ] |
| 4.11 | Verify success/failure alert | Alert shown confirming call initiated or explaining the error | [ ] |

---

## 5. Billing Flow

**Pages:** `/settings/billing`
**Backend:** `src/app/api/webhooks/stripe/route.ts`, tables `subscriptions`, `invoices`

### Sample Stripe Webhook Payloads

Use the Stripe CLI to trigger test events:

```bash
# Subscription updated
stripe trigger customer.subscription.updated

# Invoice paid
stripe trigger invoice.paid

# Invoice payment failed
stripe trigger invoice.payment_failed
```

Or POST manually to `http://localhost:3000/api/webhooks/stripe` (requires valid Stripe signature — easier to use the CLI).

| # | Step | Expected Result | Pass |
|---|---|---|---|
| **UI Verification** | | | |
| 5.1 | Navigate to `/settings/billing` | Page renders with plan card, usage bars, stat cards, invoice table, phone numbers table | [ ] |
| 5.2 | Verify plan card | Shows current plan name, price, renewal date. Emerald gradient background. "Upgrade" button visible | [ ] |
| 5.3 | Verify usage bars | AI Call Minutes and Phone Numbers progress bars render with current/limit values | [ ] |
| 5.4 | Verify stat cards | Monthly Cost, Per Extra Min, Saved vs. Manual — 3 cards with values | [ ] |
| 5.5 | Verify invoice history | Table with Date, Amount, Status columns. Status badges colored (emerald for paid) | [ ] |
| 5.6 | Verify phone numbers table | Columns: Number, Type (badge), Assigned To, Texts, Calls, Status | [ ] |
| 5.7 | Click "Open Stripe Billing Portal →" | Link/card is visible (currently a display stub — no redirect expected yet) | [ ] |
| **Webhook Testing** | | | |
| 5.8 | Start Stripe CLI listener: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` | CLI outputs webhook signing secret, shows "Ready!" | [ ] |
| 5.9 | Trigger `customer.subscription.updated` | Webhook received, `subscriptions` table row upserted. Check: `SELECT * FROM subscriptions ORDER BY updated_at DESC LIMIT 1;` | [ ] |
| 5.10 | Trigger `invoice.paid` | `invoices` table row created with `status = 'paid'` and correct amount | [ ] |
| 5.11 | Trigger `invoice.payment_failed` | `invoices` row with `status = 'failed'`. Notification inserted for all org users with type `payment_failed` | [ ] |
| 5.12 | Verify notification | Check `/dashboard` or query `notifications` table — should see "Payment Failed" notification with amount in body | [ ] |

---

## 6. DNC (Do Not Call) Flow

**Pages:** `/settings/compliance`
**Backend:** `src/app/api/webhooks/twilio/route.ts`, tables `dnc_list`, `contacts`, `leads`, `sms_messages`

### Sample Twilio SMS Webhook Payload

POST to `http://localhost:3000/api/webhooks/twilio`:

```
Content-Type: application/x-www-form-urlencoded

AccountSid=ACxxxxxxxxxxxxx&ApiVersion=2010-04-01&Body=STOP&From=%2B14165551234&To=%2B18777662137&MessageSid=SMxxxxxxxxxxxxx&NumMedia=0&SmsMessageSid=SMxxxxxxxxxxxxx&SmsSid=SMxxxxxxxxxxxxx&SmsStatus=received&NumSegments=1
```

> **Note:** The webhook validates the `X-Twilio-Signature` header using HMAC-SHA1. For local testing, either:
> - Temporarily disable signature validation
> - Use the Twilio CLI/console to send a real test SMS
> - Compute the correct signature using your `TWILIO_AUTH_TOKEN`

> **STOP keywords recognized:** `stop`, `unsubscribe`, `cancel`, `end`, `quit` (case-insensitive)

| # | Step | Expected Result | Pass |
|---|---|---|---|
| **UI Verification** | | | |
| 6.1 | Navigate to `/settings/compliance` | Page renders with status banner, Terms of Service, Regulatory Compliance, DNC List, and Auto Opt-Out Rules sections | [ ] |
| 6.2 | Verify status banner | Shows "Compliant" in emerald with last review date | [ ] |
| 6.3 | Verify DNC List card | Stats displayed: Numbers Blocked, Last Updated, Auto-Added. "Upload CSV" and "Add" buttons visible | [ ] |
| 6.4 | Verify Auto Opt-Out Rules | 4 toggles visible, all defaulted to on: SMS STOP, Verbal DNC, Email Unsubscribe, National DNC Registry | [ ] |
| 6.5 | Toggle each auto opt-out rule | Toggle state changes visually (note: these are local state only, not persisted to backend yet) | [ ] |
| **STOP Keyword Webhook** | | | |
| 6.6 | Identify a test contact phone from seed data | Query: `SELECT id, phone, is_dnc FROM contacts WHERE is_dnc = false LIMIT 1;` | [ ] |
| 6.7 | Send STOP SMS webhook with that phone number (see payload above, replace `From` with the contact's phone) | Webhook returns TwiML: "You have been unsubscribed..." | [ ] |
| 6.8 | Verify `dnc_list` entry | `SELECT * FROM dnc_list WHERE phone = '+14165551234';` — row exists with `reason = 'SMS opt-out (STOP keyword)'` | [ ] |
| 6.9 | Verify contact updated | `SELECT is_dnc FROM contacts WHERE phone = '+14165551234';` — `is_dnc = true` | [ ] |
| 6.10 | Verify leads updated | `SELECT status, last_call_outcome FROM leads WHERE contact_id = '<contact_id>';` — active leads now `status = 'bad_lead'`, `last_call_outcome = 'dnc'` | [ ] |
| 6.11 | Verify SMS logged | `SELECT * FROM sms_messages ORDER BY created_at DESC LIMIT 1;` — STOP message logged | [ ] |
| **Non-STOP SMS** | | | |
| 6.12 | Send webhook with `Body=Hello%20I%20have%20a%20question` (normal message, not a STOP keyword) | Empty TwiML response (no auto-reply) | [ ] |
| 6.13 | Verify SMS logged | `sms_messages` row created with the message body | [ ] |
| 6.14 | Verify action item created | `action_items` row with type `sms_reply`, title containing the phone number | [ ] |
| 6.15 | Verify notification | `notifications` row with type `sms_reply` for org users | [ ] |
| **Campaign Exclusion** | | | |
| 6.16 | After DNC'ing a contact, import a CSV containing that same phone number into a new campaign | `import-leads` edge function should exclude the DNC'd number; response `dnc_excluded` count is ≥ 1 | [ ] |

---

## Results Summary

| Flow | Items | Passed | Failed | Notes |
|---|---|---|---|---|
| 1. Signup | 9 | | | |
| 2. Campaign Creation | 21 | | | |
| 3. Call Simulation | 13 | | | |
| 4. Appointment | 11 | | | |
| 5. Billing | 12 | | | |
| 6. DNC | 16 | | | |
| **Total** | **82** | | | |

**Tested by:** _______________
**Date:** _______________
**Environment:** _______________
