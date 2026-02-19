# N8N Blueprint: Appointment Reminders

> **Workflow name:** `[Courtside V2] Appointment Reminders`
> **Schedule:** Daily at 8:00 AM Eastern
> **Purpose:** Send SMS and email reminders to leads who have appointments today or tomorrow.

---

## Flow Diagram

```
[Morning Cron]  ── 8:00 AM ET daily
       │
       ▼
[Get Upcoming Appointments]  ── HTTP GET appointments for today + tomorrow
       │
       ▼
[Enrich With Contact + Org]  ── Code: flatten + add "today"/"tomorrow" label
       │
       ▼
[Loop Over Appointments]  ── SplitInBatches (1 at a time)
       │
       ├── (output 1: current) ──▶ [Send Reminder SMS]
       │                                  │
       │                                  ▼
       │                           [Send Reminder Email]  ── (skip if no email)
       │                                  │
       │                                  ▼
       │                           [Wait 1s]
       │                                  │
       └──────────────────────────────────┘ (loop back)
       │
       ├── (output 0: done) ── workflow ends
```

---

## Credentials Required

| Credential Name | Type | Value |
|---|---|---|
| `Courtside V2 Supabase Service Role` | HTTP Header Auth | Name: `Authorization`, Value: `Bearer <SUPABASE_SERVICE_ROLE_KEY>` |
| `Twilio API` | Twilio API | Account SID + Auth Token |
| `Resend API Key` | HTTP Header Auth | Name: `Authorization`, Value: `Bearer <RESEND_API_KEY>` |

**Values to have ready:**
- Supabase project URL: `https://xkwywpqrthzownikeill.supabase.co`
- Supabase service role key
- Twilio Account SID, Auth Token
- Resend API key and verified sender domain

---

## Workflow Settings

| Setting | Value |
|---|---|
| Execution Order | v1 |
| Timezone | America/New_York |
| Save Data Error Execution | All |
| Save Data Success Execution | All |

---

## Node-by-Node Configuration

### Node 1: Morning Cron

| Property | Value |
|---|---|
| **Type** | Schedule Trigger |
| **Position** | [0, 300] |

**Parameters:**
- Rule type: **Cron**
- Cron Expression: `0 8 * * *`

> Fires at 8:00 AM Eastern every day. Adjust the time as needed — this should be early enough that leads get reminded before their appointment, but not so early that it wakes them up.
>
> **Timezone note:** The workflow timezone is set to `America/New_York`. If your orgs span multiple timezones, you may want to run this multiple times (e.g., 8 AM ET, 8 AM CT, 8 AM PT) or adjust the query to be timezone-aware.

**Connects to:** Get Upcoming Appointments

---

### Node 2: Get Upcoming Appointments

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [250, 300] |
| **On Error** | Stop workflow |
| **Retry on Fail** | Yes (3 attempts) |

> Fetches all appointments scheduled for today and tomorrow that are in `scheduled` status. Uses a Supabase REST query with range filter.

**Parameters:**
- Method: **GET**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/appointments?status=eq.scheduled&scheduled_at=gte.{{ $now.format('yyyy-MM-dd') }}T00:00:00&scheduled_at=lt.{{ $now.plus({days: 2}).format('yyyy-MM-dd') }}T00:00:00&select=id,org_id,lead_id,contact_id,campaign_id,scheduled_at,duration_minutes,notes,contacts(id,first_name,last_name,phone,email),organizations(id,name)`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`

> **How the date range works:**
> - `gte` today at midnight = includes all of today
> - `lt` day-after-tomorrow at midnight = includes all of tomorrow
> - This captures exactly today + tomorrow appointments

**What this returns:**
```json
[
  {
    "id": "appt-uuid-001",
    "org_id": "org-uuid",
    "lead_id": "lead-uuid",
    "contact_id": "contact-uuid",
    "campaign_id": "campaign-uuid",
    "scheduled_at": "2026-02-19T15:30:00+00:00",
    "duration_minutes": 30,
    "notes": "Refinancing consultation",
    "contacts": {
      "id": "contact-uuid",
      "first_name": "Sarah",
      "last_name": "Mitchell",
      "phone": "+14165559876",
      "email": "sarah@example.com"
    },
    "organizations": {
      "id": "org-uuid",
      "name": "Courtside Finance"
    }
  }
]
```

**Connects to:** Enrich With Contact + Org

---

### Node 3: Enrich With Contact + Org

| Property | Value |
|---|---|
| **Type** | Code |
| **Position** | [500, 300] |
| **Mode** | Run Once for All Items |
| **Language** | JavaScript |

**Code:**

```javascript
const appointments = $input.first().json;

// If no appointments, return empty — loop will exit immediately
if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
  return [];
}

const today = $now.format('yyyy-MM-dd');
const tomorrow = $now.plus({ days: 1 }).format('yyyy-MM-dd');

const results = [];

for (const appt of appointments) {
  const contact = appt.contacts;
  const org = appt.organizations;

  // Skip if no contact or no phone (can't send reminder)
  if (!contact || !contact.phone) continue;

  // Determine if appointment is today or tomorrow
  const apptDate = appt.scheduled_at.substring(0, 10); // "2026-02-19"
  const dayLabel = apptDate === today ? 'today' : 'tomorrow';

  // Format time for display (e.g., "3:30 PM")
  const apptTime = new Date(appt.scheduled_at);
  const timeStr = apptTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  results.push({
    json: {
      appointment_id: appt.id,
      org_id: appt.org_id,
      org_name: org?.name || 'your advisor',
      lead_id: appt.lead_id,
      contact_id: contact.id,
      contact_phone: contact.phone,
      contact_email: contact.email || null,
      contact_first_name: contact.first_name || 'there',
      contact_full_name: [contact.first_name, contact.last_name].filter(Boolean).join(' '),
      scheduled_at: appt.scheduled_at,
      day_label: dayLabel,
      time_display: timeStr,
      notes: appt.notes || ''
    }
  });
}

return results;
```

**What this outputs (per item):**
```json
{
  "appointment_id": "appt-uuid-001",
  "org_id": "org-uuid",
  "org_name": "Courtside Finance",
  "lead_id": "lead-uuid",
  "contact_id": "contact-uuid",
  "contact_phone": "+14165559876",
  "contact_email": "sarah@example.com",
  "contact_first_name": "Sarah",
  "contact_full_name": "Sarah Mitchell",
  "scheduled_at": "2026-02-19T15:30:00+00:00",
  "day_label": "today",
  "time_display": "3:30 PM"
}
```

**Connects to:** Loop Over Appointments

---

### Node 4: Loop Over Appointments

| Property | Value |
|---|---|
| **Type** | Split In Batches |
| **Position** | [750, 300] |
| **Batch Size** | 1 |

**Outputs:**
- **Output 0** (top): Done — all items processed (not connected)
- **Output 1** (bottom): Current item → processing

**Output 1 connects to:** Send Reminder SMS

---

### Node 5: Send Reminder SMS

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1000, 300] |
| **On Error** | Continue (using regular output) |

> Sends an SMS reminder to the lead via Twilio.

**Parameters:**
- Method: **POST**
- URL: `https://api.twilio.com/2010-04-01/Accounts/YOUR_TWILIO_ACCOUNT_SID/Messages.json`
- Authentication: **Predefined Credential Type** → **Twilio API** → select `Twilio API`
- Send Body: **Yes**
- Body Content Type: **Form Urlencoded**

**Form Parameters:**

| Name | Value (expression) |
|---|---|
| `From` | `YOUR_TWILIO_SMS_NUMBER` |
| `To` | `{{ $json.contact_phone }}` |
| `Body` | `=Hi {{ $json.contact_first_name }}, this is a reminder that you have an appointment {{ $json.day_label }} at {{ $json.time_display }} with {{ $json.org_name }}. We look forward to speaking with you! Reply STOP to opt out.` |

> **From number:** Use the org's dedicated Twilio number. For V1, hardcode the number. For multi-tenant, you'd query the `phone_numbers` table for the org's SMS number. A simple enhancement is to add a "Get Org Phone" HTTP GET node before this.
>
> **Example SMS:** "Hi Sarah, this is a reminder that you have an appointment today at 3:30 PM with Courtside Finance. We look forward to speaking with you! Reply STOP to opt out."

**Connects to:** Send Reminder Email

---

### Node 6: Send Reminder Email

| Property | Value |
|---|---|
| **Type** | IF |
| **Position** | [1250, 300] |

> Only sends the email if the contact has an email address. Otherwise, skips to Wait.

**Condition:**
- Value 1 (expression): `{{ $('Loop Over Appointments').item.json.contact_email }}`
- Operation: **is not empty**

**TRUE output connects to:** Send Email (HTTP Request)
**FALSE output connects to:** Wait 1s

---

### Node 7: Send Email (HTTP Request)

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1500, 200] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://api.resend.com/emails`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Resend API Key`
- Send Headers: **Yes**
  - `Content-Type`: `application/json`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "from": "Courtside AI <notifications@yourdomain.com>",
  "to": "{{ $('Loop Over Appointments').item.json.contact_email }}",
  "subject": "Appointment Reminder — {{ $('Loop Over Appointments').item.json.day_label === 'today' ? 'Today' : 'Tomorrow' }} at {{ $('Loop Over Appointments').item.json.time_display }}",
  "html": "<div style='font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;'><h2 style='color: #059669;'>Appointment Reminder</h2><p>Hi {{ $('Loop Over Appointments').item.json.contact_first_name }},</p><p>This is a friendly reminder that you have an appointment <strong>{{ $('Loop Over Appointments').item.json.day_label }}</strong> at <strong>{{ $('Loop Over Appointments').item.json.time_display }}</strong> with {{ $('Loop Over Appointments').item.json.org_name }}.</p><p>We look forward to speaking with you!</p><p style='color: #999; font-size: 12px; margin-top: 24px;'>— {{ $('Loop Over Appointments').item.json.org_name }}</p></div>"
}
```

> **Sender domain:** Replace `notifications@yourdomain.com` with your verified Resend sender address.

**Connects to:** Wait 1s

---

### Node 8: Wait 1s

| Property | Value |
|---|---|
| **Type** | Wait |
| **Position** | [1750, 300] |

**Parameters:**
- Wait: **1**
- Unit: **Seconds**

> Prevents hitting Twilio/Resend rate limits when processing multiple appointments.

**Connects to:** Loop Over Appointments (loops back)

---

## Connection Summary

| From Node | Output | To Node |
|---|---|---|
| Morning Cron | main[0] | Get Upcoming Appointments |
| Get Upcoming Appointments | main[0] | Enrich With Contact + Org |
| Enrich With Contact + Org | main[0] | Loop Over Appointments |
| Loop Over Appointments | main[1] (current item) | Send Reminder SMS |
| Send Reminder SMS | main[0] | Send Reminder Email (IF) |
| Send Reminder Email (IF) | TRUE | Send Email (HTTP Request) |
| Send Reminder Email (IF) | FALSE | Wait 1s |
| Send Email (HTTP Request) | main[0] | Wait 1s |
| Wait 1s | main[0] | Loop Over Appointments |

---

## Testing

### Test the Supabase query independently

```bash
# Get appointments for today and tomorrow (replace dates with actual)
curl -X GET \
  "https://xkwywpqrthzownikeill.supabase.co/rest/v1/appointments?status=eq.scheduled&scheduled_at=gte.2026-02-19T00:00:00&scheduled_at=lt.2026-02-21T00:00:00&select=id,org_id,lead_id,contact_id,campaign_id,scheduled_at,duration_minutes,notes,contacts(id,first_name,last_name,phone,email),organizations(id,name)" \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

### Test SMS via Twilio

```bash
curl -X POST \
  "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN" \
  --data-urlencode "From=+1YOUR_TWILIO_NUMBER" \
  --data-urlencode "To=+1YOUR_TEST_PHONE" \
  --data-urlencode "Body=Hi Sarah, this is a reminder that you have an appointment today at 3:30 PM with Courtside Finance. We look forward to speaking with you! Reply STOP to opt out."
```

### Test email via Resend

```bash
curl -X POST \
  https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Courtside AI <notifications@yourdomain.com>",
    "to": "your-test-email@example.com",
    "subject": "Appointment Reminder — Today at 3:30 PM",
    "html": "<h2>Appointment Reminder</h2><p>Hi Sarah,</p><p>This is a friendly reminder that you have an appointment <strong>today</strong> at <strong>3:30 PM</strong> with Courtside Finance.</p><p>We look forward to speaking with you!</p>"
  }'
```

---

## Testing in n8n (Manual Execution)

1. **Build all nodes** with the configs above
2. **Pin test data** on the "Get Upcoming Appointments" node:

```json
[
  [
    {
      "id": "appt-test-001",
      "org_id": "test-org-001",
      "lead_id": "test-lead-001",
      "contact_id": "test-contact-001",
      "campaign_id": "test-campaign-001",
      "scheduled_at": "2026-02-19T15:30:00+00:00",
      "duration_minutes": 30,
      "notes": "Refinancing consultation",
      "contacts": {
        "id": "test-contact-001",
        "first_name": "Sarah",
        "last_name": "Mitchell",
        "phone": "+14165559876",
        "email": "sarah@example.com"
      },
      "organizations": {
        "id": "test-org-001",
        "name": "Courtside Finance"
      }
    },
    {
      "id": "appt-test-002",
      "org_id": "test-org-001",
      "lead_id": "test-lead-002",
      "contact_id": "test-contact-002",
      "campaign_id": "test-campaign-001",
      "scheduled_at": "2026-02-20T10:00:00+00:00",
      "duration_minutes": 30,
      "notes": "Insurance review",
      "contacts": {
        "id": "test-contact-002",
        "first_name": "Robert",
        "last_name": "Chen",
        "phone": "+14165551111",
        "email": null
      },
      "organizations": {
        "id": "test-org-001",
        "name": "Courtside Finance"
      }
    }
  ]
]
```

> The test data includes two appointments: one today with email (SMS + email), one tomorrow without email (SMS only). This exercises both the IF true and false branches.

3. **Execute workflow manually** (click "Test Workflow")
4. **Check each node's output:**
   - Enrich node should produce 2 items (one "today", one "tomorrow")
   - Loop should iterate twice
   - First iteration: SMS sent + email sent (IF = true)
   - Second iteration: SMS sent + email skipped (IF = false)
5. **Remove pinned data** and test with real Supabase data
6. **Activate** the workflow when everything works

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| No appointments returned | No `scheduled` appointments in date range | Verify appointments exist with `status = 'scheduled'` and `scheduled_at` within today/tomorrow |
| Enrich node returns empty | All appointments missing contact phone | Check that `contacts.phone` is populated for the relevant contacts |
| SMS fails with 400 | Invalid phone number format | Ensure phone numbers are E.164 (`+1XXXXXXXXXX`) |
| SMS fails with 401 | Wrong Twilio credentials | Check Account SID and Auth Token in n8n credentials |
| Email skipped for all | No contacts have email addresses | This is expected — SMS is the primary channel. Email is sent when available. |
| Email fails with 403 | Resend sender domain not verified | Verify your sender domain in the Resend dashboard |
| Duplicate reminders sent | Workflow ran multiple times in same day | Check execution history. Ensure cron expression is correct (`0 8 * * *` = once at 8 AM). |
| Wrong time displayed | Timezone mismatch | The Code node formats time in `America/New_York`. Adjust if org uses a different timezone. |
| Loop runs forever | Wait node not connected back to loop | Ensure Wait 1s → Loop Over Appointments connection exists |

---

## Future Enhancements

| Enhancement | Description |
|---|---|
| **Multi-timezone support** | Query org timezone from `organizations` or `users.timezone`, format appointment time per-org |
| **Org-specific From number** | Query `phone_numbers` table for each org's SMS number instead of hardcoding |
| **Duplicate prevention** | Track sent reminders in `sms_messages` / `emails` tables, skip if already sent today |
| **Broker notification** | INSERT into `notifications` table so brokers also get a morning reminder of today's appointments |
| **Configurable timing** | Allow orgs to set when reminders go out (e.g., 1 hour before, evening before) |

---

## Prerequisites & Dependencies

| Dependency | Status | Notes |
|---|---|---|
| Appointments in DB | Required | Post-call webhook (7.1) creates appointments for "booked" outcomes |
| Contacts with phone numbers | Required | Leads must have valid phone numbers |
| Twilio credentials | Required | For SMS reminders |
| Resend API key | Optional | Only needed if contacts have email addresses |
| Supabase foreign key joins | Required | The query uses `contacts(...)` and `organizations(...)` embedded selects |

---

*Last updated: 2026-02-19*
