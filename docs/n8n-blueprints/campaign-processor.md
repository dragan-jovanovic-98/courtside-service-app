# N8N Blueprint: Campaign Processor

> **Workflow name:** `[Courtside V2] Campaign Processor`
> **Schedule:** Every 2 minutes
> **Purpose:** Pick up eligible leads from active campaigns and initiate outbound calls via Retell API.

---

## Flow Diagram

```
[Every 2 Minutes]
       │
       ▼
[Get Campaign Leads]  ── POST to Edge Function
       │
       ▼
[Flatten Leads]  ── Code node: batches → individual lead items
       │
       ▼
[Loop Over Leads]  ── SplitInBatches (1 at a time)
       │
       ├── (output 1: current lead) ──▶ [Create Retell Call]
       │                                      │
       │                         ┌─────────────┴──────────────┐
       │                    (success)                     (error)
       │                         ▼                            ▼
       │                 [Insert Call Record]        [Update Lead Error]
       │                         │                            │
       │                         ▼                            │
       │                  [Update Lead]                       │
       │                         │                            │
       │                         ▼                            ▼
       │                        [Wait 2s] ◄───────────────────┘
       │                            │
       └────────────────────────────┘ (loop back)
       │
       ├── (output 0: done) ── workflow ends
```

---

## Credentials Required

Set these up in **n8n Settings → Credentials** before building the workflow:

| Credential Name | Type | Value |
|---|---|---|
| `Courtside V2 Supabase Service Role` | HTTP Header Auth | Name: `Authorization`, Value: `Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>` |
| `Retell API Key` | HTTP Header Auth | Name: `Authorization`, Value: `Bearer <YOUR_RETELL_API_KEY>` |

You'll also need the **Supabase service role key** for `apikey` headers on REST API calls (Nodes 6, 7, 8). This is the same key used in the credential above.

**Values to have ready:**
- Supabase project URL: `https://xkwywpqrthzownikeill.supabase.co`
- Supabase service role key (from Supabase dashboard → Settings → API)
- Retell API key (from Retell dashboard → Settings → API Keys)

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

### Node 1: Every 2 Minutes

| Property | Value |
|---|---|
| **Type** | Schedule Trigger |
| **Position** | [0, 300] |

**Parameters:**
- Rule type: **Minutes**
- Minutes interval: **2**

**Connects to:** Get Campaign Leads

---

### Node 2: Get Campaign Leads

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [250, 300] |
| **On Error** | Stop workflow (default) |
| **Retry on Fail** | Yes (3 attempts) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/functions/v1/get-next-campaign-leads`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Options → Timeout: **15000** ms

**What this returns:**
```json
{
  "batches": [
    {
      "campaign_id": "uuid",
      "campaign_name": "Spring Mortgage Campaign",
      "org_id": "uuid",
      "agent_id": "uuid",
      "retell_agent_id": "agent_xxx",
      "from_number": "+14165551234",
      "leads": [
        {
          "lead_id": "uuid",
          "contact_id": "uuid",
          "contact_phone": "+14165559876",
          "contact_name": "Sarah Mitchell",
          "retry_count": 0
        }
      ]
    }
  ],
  "total_leads": 3,
  "skipped": [
    { "campaign_id": "uuid", "reason": "Outside schedule window" }
  ]
}
```

**Connects to:** Flatten Leads

---

### Node 3: Flatten Leads

| Property | Value |
|---|---|
| **Type** | Code |
| **Position** | [500, 300] |
| **Mode** | Run Once for All Items |
| **Language** | JavaScript |

**Code:**

```javascript
const data = $input.first().json;

// If no batches or empty, return nothing — loop will exit immediately
if (!data.batches || data.batches.length === 0) {
  return [];
}

// Flatten: each lead gets its campaign context attached
const leads = [];
for (const batch of data.batches) {
  for (const lead of batch.leads) {
    leads.push({
      json: {
        campaign_id: batch.campaign_id,
        campaign_name: batch.campaign_name,
        org_id: batch.org_id,
        agent_id: batch.agent_id,
        retell_agent_id: batch.retell_agent_id,
        from_number: batch.from_number,
        lead_id: lead.lead_id,
        contact_id: lead.contact_id,
        contact_phone: lead.contact_phone,
        contact_name: lead.contact_name,
        retry_count: lead.retry_count
      }
    });
  }
}

return leads;
```

**What this outputs (per item):**
```json
{
  "campaign_id": "uuid",
  "campaign_name": "Spring Mortgage Campaign",
  "org_id": "uuid",
  "agent_id": "uuid",
  "retell_agent_id": "agent_xxx",
  "from_number": "+14165551234",
  "lead_id": "uuid",
  "contact_id": "uuid",
  "contact_phone": "+14165559876",
  "contact_name": "Sarah Mitchell",
  "retry_count": 0
}
```

**Connects to:** Loop Over Leads

---

### Node 4: Loop Over Leads

| Property | Value |
|---|---|
| **Type** | Split In Batches |
| **Position** | [750, 300] |
| **Batch Size** | 1 |

**Outputs:**
- **Output 0** (top): Done — all items processed (not connected to anything)
- **Output 1** (bottom): Current item — connects to next processing node

**Output 1 connects to:** Create Retell Call

---

### Node 5: Create Retell Call

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1000, 300] |
| **On Error** | **Continue (using error output)** ← Important! |

**Parameters:**
- Method: **POST**
- URL: `https://api.retellai.com/v2/create-phone-call`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Retell API Key`
- Send Headers: **Yes**
  - `Content-Type`: `application/json`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "from_number": "{{ $json.from_number }}",
  "to_number": "{{ $json.contact_phone }}",
  "override_agent_id": "{{ $json.retell_agent_id }}",
  "metadata": {
    "lead_id": "{{ $json.lead_id }}",
    "campaign_id": "{{ $json.campaign_id }}",
    "org_id": "{{ $json.org_id }}",
    "contact_id": "{{ $json.contact_id }}"
  },
  "retell_llm_dynamic_variables": {
    "first_name": "{{ $json.contact_name.split(' ')[0] }}"
  }
}
```

> **Note:** The `=` prefix at the start makes this an n8n expression. The `{{ }}` blocks inside are expression interpolations.

**What Retell returns on success:**
```json
{
  "call_id": "call_xxx",
  "agent_id": "agent_xxx",
  "from_number": "+14165551234",
  "to_number": "+14165559876",
  "status": "registered"
}
```

**Outputs:**
- **Output 0** (success): Connects to → Insert Call Record
- **Output 1** (error): Connects to → Update Lead Error

---

### Node 6: Insert Call Record

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1250, 150] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/calls`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "retell_call_id": "{{ $json.call_id }}",
  "org_id": "{{ $('Loop Over Leads').item.json.org_id }}",
  "lead_id": "{{ $('Loop Over Leads').item.json.lead_id }}",
  "contact_id": "{{ $('Loop Over Leads').item.json.contact_id }}",
  "agent_id": "{{ $('Loop Over Leads').item.json.agent_id }}",
  "campaign_id": "{{ $('Loop Over Leads').item.json.campaign_id }}",
  "direction": "outbound",
  "caller_phone": "{{ $('Loop Over Leads').item.json.from_number }}",
  "callee_phone": "{{ $('Loop Over Leads').item.json.contact_phone }}",
  "started_at": "{{ $now.toISO() }}"
}
```

> **Why `$('Loop Over Leads').item.json.xxx`?** After the Retell call, `$json` contains the Retell response (with `call_id`). To reference the original lead data, we reach back to the Loop node's current item.

> **Why insert a call record here?** The Edge Function `get-next-campaign-leads` uses active calls (started in last 10 min with no outcome) for concurrency tracking. Without this record, the same lead could be picked up again.

**Connects to:** Update Lead

---

### Node 7: Update Lead

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1500, 150] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/leads?id=eq.{{ $('Loop Over Leads').item.json.lead_id }}`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "status": "contacted",
  "last_activity_at": "{{ $now.toISO() }}",
  "retry_count": {{ $('Loop Over Leads').item.json.retry_count + 1 }},
  "updated_at": "{{ $now.toISO() }}"
}
```

> **Note:** `retry_count` has no quotes — it's a number, not a string.

**Connects to:** Wait 2s

---

### Node 8: Update Lead Error

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1250, 500] |
| **On Error** | Continue (using regular output) |

This node fires when Retell returns an error (bad number, rate limit, etc.). We still update the lead so it doesn't get retried immediately.

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/leads?id=eq.{{ $('Loop Over Leads').item.json.lead_id }}`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "last_activity_at": "{{ $now.toISO() }}",
  "retry_count": {{ $('Loop Over Leads').item.json.retry_count + 1 }},
  "updated_at": "{{ $now.toISO() }}"
}
```

> **Note:** Same as Node 7, but does NOT set `status: "contacted"` — the call never connected, so we don't change the status.

**Connects to:** Wait 2s

---

### Node 9: Wait 2s

| Property | Value |
|---|---|
| **Type** | Wait |
| **Position** | [1750, 300] |

**Parameters:**
- Wait: **2**
- Unit: **Seconds**

> **Why wait?** Prevents hitting Retell's rate limit when processing multiple leads. 2 seconds between calls is a safe buffer.

**Connects to:** Loop Over Leads (loops back)

---

## Connection Summary

| From Node | Output | To Node |
|---|---|---|
| Every 2 Minutes | main[0] | Get Campaign Leads |
| Get Campaign Leads | main[0] | Flatten Leads |
| Flatten Leads | main[0] | Loop Over Leads |
| Loop Over Leads | main[1] (current item) | Create Retell Call |
| Create Retell Call | main[0] (success) | Insert Call Record |
| Create Retell Call | main[1] (error) | Update Lead Error |
| Insert Call Record | main[0] | Update Lead |
| Update Lead | main[0] | Wait 2s |
| Update Lead Error | main[0] | Wait 2s |
| Wait 2s | main[0] | Loop Over Leads |

---

## Testing

### Test the Edge Function independently

```bash
# Get next campaign leads (requires active campaigns + eligible leads in DB)
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/functions/v1/get-next-campaign-leads \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "batches": [...],
  "total_leads": 0,
  "skipped": [
    {"campaign_id": "...", "reason": "No eligible leads"}
  ]
}
```

If `total_leads: 0`, that's fine — it means no campaigns are active or no leads are eligible. The Flatten Leads code node will return `[]` and the loop will exit immediately.

### Test the Retell API independently

```bash
# Create a phone call (replace with real values)
curl -X POST \
  https://api.retellai.com/v2/create-phone-call \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_number": "+14165551234",
    "to_number": "+14165559876",
    "override_agent_id": "agent_xxx",
    "metadata": {
      "lead_id": "test-lead-id",
      "campaign_id": "test-campaign-id",
      "org_id": "test-org-id",
      "contact_id": "test-contact-id"
    },
    "retell_llm_dynamic_variables": {
      "first_name": "Test"
    }
  }'
```

**Expected response:**
```json
{
  "call_id": "call_xxx",
  "agent_id": "agent_xxx",
  "status": "registered"
}
```

### Test inserting a call record

```bash
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/rest/v1/calls \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "retell_call_id": "call_test_123",
    "org_id": "YOUR_ORG_ID",
    "lead_id": "YOUR_LEAD_ID",
    "contact_id": "YOUR_CONTACT_ID",
    "agent_id": "YOUR_AGENT_ID",
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "direction": "outbound",
    "caller_phone": "+14165551234",
    "callee_phone": "+14165559876",
    "started_at": "2026-02-19T15:00:00.000Z"
  }'
```

### Test updating a lead

```bash
curl -X PATCH \
  "https://xkwywpqrthzownikeill.supabase.co/rest/v1/leads?id=eq.YOUR_LEAD_ID" \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "status": "contacted",
    "last_activity_at": "2026-02-19T15:00:00.000Z",
    "retry_count": 1,
    "updated_at": "2026-02-19T15:00:00.000Z"
  }'
```

---

## Testing in n8n (Manual Execution)

1. **Build all nodes** with the configs above
2. **Pin test data** on the "Get Campaign Leads" node to simulate the Edge Function response:

```json
[
  {
    "batches": [
      {
        "campaign_id": "test-campaign-001",
        "campaign_name": "Test Campaign",
        "org_id": "test-org-001",
        "agent_id": "test-agent-001",
        "retell_agent_id": "agent_xxx",
        "from_number": "+14165551234",
        "leads": [
          {
            "lead_id": "test-lead-001",
            "contact_id": "test-contact-001",
            "contact_phone": "+14165559876",
            "contact_name": "Test User",
            "retry_count": 0
          }
        ]
      }
    ],
    "total_leads": 1,
    "skipped": []
  }
]
```

3. **Execute workflow manually** (click "Test Workflow")
4. **Check each node's output** — click on each node to see what data flowed through
5. **Verify in Supabase:** Check `calls` table for the new record, `leads` table for the updated status
6. **Remove pinned data** and test with real Edge Function response
7. **Activate** the workflow when everything works

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Get Campaign Leads returns 401 | Wrong service role key in credential | Check credential value matches Supabase dashboard → Settings → API → service_role |
| Get Campaign Leads returns `{"batches": [], "total_leads": 0}` | No active campaigns, or outside schedule window | Check campaign status is "active" and current time is within schedule |
| Create Retell Call errors with "invalid number" | Phone number format issue | Ensure numbers are E.164 format (+1XXXXXXXXXX) |
| Create Retell Call errors with 401 | Wrong Retell API key | Check Retell dashboard → Settings → API Keys |
| Insert Call Record returns 409 | Duplicate retell_call_id | Call record already exists — check if workflow ran twice |
| Update Lead returns empty 200 | No matching lead ID | Verify lead_id exists in the leads table |
| Loop runs forever | Wait node not connected back to Loop | Ensure Wait 2s → Loop Over Leads connection exists |
| Loop processes 0 items | Flatten Leads returned empty array | Check Edge Function response — likely no eligible leads |

---

## How the Concurrency System Works

The Edge Function `get-next-campaign-leads` has built-in concurrency control:

1. **Per-org max:** 8 concurrent calls per organization
2. **Active call detection:** Counts calls started in the last 10 minutes with `outcome IS NULL`
3. **Available slots:** `8 - active_calls = slots_remaining`
4. **Batch size:** `min(slots_remaining, daily_call_limit_remaining)`

When this workflow inserts a call record (Node 6) with `started_at = now` and no `outcome`, it counts as an active call. The post-call webhook (7.1) will later update this record with the outcome, which "releases" the concurrency slot.

If the Retell call fails (Node 5 error path), no call record is inserted, so no slot is consumed. The lead's `retry_count` is incremented and `last_activity_at` is set, which means the Edge Function's retry interval logic will delay the next attempt.

---

*Last updated: 2026-02-19*
