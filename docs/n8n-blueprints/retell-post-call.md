# N8N Blueprint: Retell Post-Call Webhook

> **Workflow name:** `[Courtside V2] Retell Post-Call Analysis`
> **Trigger:** Retell webhook (fires when a call ends and is analyzed)
> **Purpose:** Receive Retell post-call data, analyze the transcript with AI, update call/lead records, and trigger outcome-specific automation (appointments, action items, notifications, DNC).

---

## Flow Diagram

```
[Webhook]  ── Retell POST /retell-post-call
     │
     ▼
[Filter]  ── event=call_analyzed, call_type=phone_call, direction=outbound
     │
     ▼
[Analyze Call]  ── LLM Chain (OpenAI gpt-5.2 + Structured Output Parser)
     │                  ▲                    ▲
     │           [OpenAI Chat Model]  [Structured Output Parser]
     ▼
[Parse AI Output]  ── Code: JSON.parse(item.json.text)
     │
     ▼
[Build Call Record]  ── Code: merge Retell webhook data + AI analysis
     │
     ▼
[Update Call Record]  ── HTTP PATCH calls (match on retell_call_id)
     │
     ▼
[Map Lead Status]  ── Code: outcome → lead status + last_call_outcome
     │
     ▼
[Update Lead]  ── HTTP PATCH leads
     │
     ▼
[Get Org Users]  ── HTTP GET users by org_id (for notification user_id)
     │
     ▼
[Outcome Router]  ── Switch on outcome
     │
     ├── "booked" ──▶ [Insert Appointment] → [SMS Lead] → [Email Lead] → [Notify Broker]
     │
     ├── "interested" ──▶ [Create Action Item] → [Notify Broker]
     │
     ├── "callback" ──▶ [Create Action Item] → [Notify Broker]
     │
     ├── "dnc" ──▶ [Add to DNC List] → [Mark All Leads Bad] → [Mark Contact] → [Log Event]
     │
     └── (voicemail, no_answer, not_interested, wrong_number) ── no additional actions
```

---

## Credentials Required

Set these up in **n8n Settings → Credentials** before building the workflow:

| Credential Name | Type | Value |
|---|---|---|
| `Courtside V2 Supabase Service Role` | HTTP Header Auth | Name: `Authorization`, Value: `Bearer <SUPABASE_SERVICE_ROLE_KEY>` |
| `Courtside OpenAI` | OpenAI API | API Key from OpenAI dashboard |
| `Twilio API` | Twilio API | Account SID + Auth Token from Twilio console |
| `KC Sendgrid` | SendGrid API | SendGrid API Key |

**Values to have ready:**
- Supabase project URL: `https://xkwywpqrthzownikeill.supabase.co`
- Supabase service role key
- OpenAI API key
- Twilio Account SID, Auth Token, and outbound SMS number
- SendGrid API key (sender domain: `court-side.ai`)

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

### Node 1: Webhook

| Property | Value |
|---|---|
| **Type** | Webhook |
| **Position** | [0, 300] |
| **HTTP Method** | POST |
| **Path** | `services/retell-post-call-outbound` |

The full webhook URL will be: `https://n8n.courtside-ai.com/webhook/services/retell-post-call-outbound`

> **Register this URL in Retell:** Go to Retell Dashboard → Settings → Webhooks → Add the URL above as the post-call webhook endpoint.

**What Retell sends (key fields):**
```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "call_xxx",
    "agent_id": "agent_xxx",
    "call_type": "phone_call",
    "call_status": "ended",
    "direction": "outbound",
    "from_number": "+14165551234",
    "to_number": "+14165559876",
    "start_timestamp": 1740000000000,
    "end_timestamp": 1740000180000,
    "duration_ms": 180000,
    "recording_url": "https://retell-storage.s3.amazonaws.com/...",
    "transcript": "Agent: Hi, is this Sarah? ...",
    "transcript_object": [...],
    "disconnection_reason": "agent_hangup",
    "call_analysis": { ... },
    "call_cost": {
      "combined_cost": 45
    },
    "metadata": {
      "lead_id": "uuid",
      "campaign_id": "uuid",
      "org_id": "uuid",
      "contact_id": "uuid"
    },
    "retell_llm_dynamic_variables": {
      "first_name": "Sarah"
    },
    "latency": {
      "e2e": { "p50": 850 }
    }
  }
}
```

**Connects to:** Filter

---

### Node 2: Filter

| Property | Value |
|---|---|
| **Type** | Filter |
| **Position** | [250, 300] |

**Conditions (AND — all must be true):**

| Condition | Left | Operator | Right |
|---|---|---|---|
| 1 | `{{ $json.body.event }}` | equals | `call_analyzed` |
| 2 | `{{ $json.body.call.call_type }}` | equals | `phone_call` |
| 3 | `{{ $json.body.call.direction }}` | equals | `outbound` |

> **Why filter?** Retell sends multiple event types (`call_started`, `call_ended`, `call_analyzed`). We only process `call_analyzed` for outbound phone calls. Web calls and inbound calls are ignored for now.

**Connects to:** Analyze Call

---

### Node 3: OpenAI Chat Model (Sub-node)

| Property | Value |
|---|---|
| **Type** | `@n8n/n8n-nodes-langchain.lmChatOpenAi` |
| **Position** | [500, 500] |
| **Model** | `gpt-5.2` |
| **Temperature** | 0.2 |
| **Credentials** | Select `Courtside OpenAI` |

> This is a sub-node — it doesn't appear in the main flow. It connects to the "Analyze Call" LLM Chain node via the **AI Language Model** connector (drag from this node's output to the Analyze Call node's AI Language Model input).

**Connected to:** Analyze Call (ai_languageModel input)

---

### Node 4: Structured Output Parser (Sub-node)

| Property | Value |
|---|---|
| **Type** | `@n8n/n8n-nodes-langchain.outputParserStructured` |
| **Position** | [500, 650] |

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "outcome": {
      "type": "string",
      "enum": ["booked", "interested", "callback", "voicemail", "no_answer", "not_interested", "wrong_number", "dnc"],
      "description": "The primary outcome classification of the call"
    },
    "outcome_confidence": {
      "type": "number",
      "description": "Confidence score from 0 to 1"
    },
    "outcome_reasoning": {
      "type": "string",
      "description": "Brief explanation of why this outcome was chosen"
    },
    "appointment": {
      "type": ["object", "null"],
      "properties": {
        "date": { "type": "string", "description": "YYYY-MM-DD format" },
        "time": { "type": "string", "description": "HH:MM in 24-hour format" },
        "timezone": { "type": "string", "description": "IANA timezone, e.g. America/Toronto" },
        "duration_minutes": { "type": "number" },
        "confirmed_by_lead": { "type": "boolean" }
      },
      "description": "Only when outcome is 'booked'. Null otherwise."
    },
    "callback": {
      "type": ["object", "null"],
      "properties": {
        "requested_date": { "type": ["string", "null"] },
        "requested_time": { "type": ["string", "null"] },
        "timezone": { "type": ["string", "null"] },
        "is_specific_time": { "type": "boolean" },
        "notes": { "type": "string" }
      },
      "description": "Only when outcome is 'callback'. Null otherwise."
    },
    "summary": {
      "type": "string",
      "description": "2-3 sentence summary of the call for the broker"
    },
    "summary_one_line": {
      "type": "string",
      "description": "Under 100 characters. For notifications and list views."
    },
    "sentiment": {
      "type": "string",
      "enum": ["positive", "neutral", "negative"]
    },
    "engagement_level": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    },
    "financial_details": {
      "type": ["object", "null"],
      "properties": {
        "current_rate": { "type": ["string", "null"] },
        "desired_rate": { "type": ["string", "null"] },
        "loan_amount": { "type": ["string", "null"] },
        "property_type": { "type": ["string", "null"] },
        "mortgage_type": { "type": ["string", "null"] },
        "timeline": { "type": ["string", "null"] },
        "other_details": { "type": ["string", "null"] }
      }
    },
    "objections": {
      "type": ["array", "null"],
      "items": {
        "type": "object",
        "properties": {
          "objection": { "type": "string" },
          "handled": { "type": "boolean" },
          "handling_notes": { "type": "string" }
        }
      }
    },
    "topics": {
      "type": "array",
      "items": { "type": "string" }
    },
    "follow_up": {
      "type": "object",
      "properties": {
        "recommended_action": { "type": ["string", "null"] },
        "lead_questions_unanswered": { "type": "array", "items": { "type": "string" } },
        "urgency_level": { "type": "string", "enum": ["high", "medium", "low"] },
        "best_contact_time": { "type": ["string", "null"] }
      }
    },
    "compliance": {
      "type": "object",
      "properties": {
        "dnc_requested": { "type": "boolean" },
        "profanity_detected": { "type": "boolean" },
        "recording_consent_given": { "type": ["boolean", "null"] }
      }
    }
  },
  "required": ["outcome", "outcome_confidence", "outcome_reasoning", "summary", "summary_one_line", "sentiment", "engagement_level", "topics", "follow_up", "compliance"]
}
```

> This is a sub-node. Connect its output to the "Analyze Call" LLM Chain node's **Output Parser** input.

**Connected to:** Analyze Call (ai_outputParser input)

---

### Node 5: Analyze Call (LLM Chain)

| Property | Value |
|---|---|
| **Type** | `@n8n/n8n-nodes-langchain.chainLlm` |
| **Position** | [500, 300] |

**System Prompt:**

```
You are an expert call analyst for a financial services AI calling platform. You analyze phone call transcripts between an AI voice agent and a prospective lead (mortgage, insurance, or financial services prospect).

Your job is to extract structured data from the call transcript. Be precise and evidence-based — only report what is clearly supported by the transcript.

## OUTCOME CLASSIFICATION

Choose exactly one outcome:
- "booked": The lead agreed to a specific appointment date AND time. Both must be explicitly stated or confirmed.
- "interested": The lead expressed interest in services but did NOT book an appointment. They may have asked questions, requested information, or said they'd think about it.
- "callback": The lead explicitly asked to be called back at a different time. They did NOT refuse — they want to talk, just not right now.
- "voicemail": The call reached voicemail or an answering machine. The AI left a message or hung up.
- "no_answer": Nobody answered the phone. No voicemail was reached. Short call with only ringing.
- "not_interested": The lead explicitly declined, said they are not interested, already have a provider they're happy with, or otherwise clearly rejected the offer.
- "wrong_number": The person who answered is not the intended lead. They said "wrong number", "no one by that name here", etc.
- "dnc": The person explicitly asked to not be called again, said "take me off your list", "stop calling me", "do not call", or similar.

## APPOINTMENT EXTRACTION (only when outcome = "booked")
Extract the EXACT date, time, and timezone. If the lead said "Thursday at 10:30", calculate the actual date based on the current context. If timezone is not mentioned, use "America/Toronto" as default.

## CALLBACK EXTRACTION (only when outcome = "callback")
If the lead mentioned a specific date/time for callback, extract it. If they just said "call me later" without specifics, set is_specific_time to false.

## FINANCIAL DETAILS
Extract any financial information discussed: rates, loan amounts, property types, coverage amounts, policy types, timelines. Only include what was actually mentioned — leave fields null if not discussed.

## IMPORTANT RULES
- outcome_confidence should reflect how clear the classification is (0.5 = ambiguous, 0.9+ = very clear)
- summary should be 2-3 sentences, written for the broker who will follow up
- summary_one_line must be under 100 characters — used in notifications
- If dnc_requested is true in compliance, the outcome MUST be "dnc"
- For voicemail/no_answer, many fields will be null — that's expected
```

**User Prompt (expression):**

```
Disconnection reason: {{ $json.body.call.disconnection_reason }}

Call duration: {{ Math.round($json.body.call.duration_ms / 1000) }} seconds

Transcript:
{{ $json.body.call.transcript }}
```

**Sub-node connections:**
- AI Language Model input ← OpenAI Chat Model (Node 3)
- Output Parser input ← Structured Output Parser (Node 4)

**Connects to:** Parse AI Output

---

### Node 6: Parse AI Output

| Property | Value |
|---|---|
| **Type** | Code |
| **Position** | [750, 300] |
| **Mode** | Run Once for All Items |
| **Language** | JavaScript |

**Code:**

```javascript
return items.map(item => {
  const parsed = JSON.parse(item.json.text);
  return { json: parsed };
});
```

> This is the same pattern used in V1. The LLM Chain outputs `{ text: "..." }` where the text is a JSON string. We parse it into a proper object.

**What this outputs (flat structure — the Structured Output Parser flattens nested objects):**
```json
{
  "outcome": "booked",
  "outcome_confidence": 0.97,
  "outcome_reasoning": "Lead agreed to a specific appointment day and time (Thursday at 10:30 AM)",
  "appointment_date": "2026-02-26",
  "appointment_time": "10:30",
  "appointment_timezone": "America/Toronto",
  "appointment_duration_minutes": 30,
  "appointment_confirmed_by_lead": true,
  "callback_requested_date": "",
  "callback_requested_time": "",
  "callback_timezone": "",
  "callback_is_specific_time": false,
  "callback_notes": "",
  "summary": "Sarah confirmed she is interested in refinancing...",
  "summary_one_line": "Booked refinance consult: Thu 2026-02-26 at 10:30",
  "sentiment": "positive",
  "engagement_level": "high",
  "financial_current_rate": "6.2%",
  "financial_desired_rate": "",
  "financial_loan_amount": "",
  "financial_property_type": "",
  "financial_mortgage_type": "Refinance",
  "financial_timeline": "",
  "financial_other_details": "",
  "objections": [],
  "topics": ["mortgage refinancing", "interest rate", "appointment scheduling"],
  "follow_up_recommended_action": "Send confirmation and prepare refinance options",
  "follow_up_urgency_level": "medium",
  "follow_up_best_contact_time": "",
  "follow_up_lead_questions_unanswered": [],
  "compliance_dnc_requested": false,
  "compliance_profanity_detected": false,
  "compliance_recording_consent_given": false
}
```

**Connects to:** Build Call Record

---

### Node 7: Build Call Record

| Property | Value |
|---|---|
| **Type** | Code |
| **Position** | [1000, 300] |
| **Mode** | Run Once for All Items |
| **Language** | JavaScript |

**Code:**

```javascript
// AI analysis output from Parse AI Output (flat structure)
const ai = $input.first().json;

// Original Retell webhook data — reach back to the Webhook node
const retell = $('Webhook').first().json.body.call;
const metadata = retell.metadata || {};

// Convert Retell Unix timestamps to ISO strings
const startedAt = retell.start_timestamp
  ? new Date(retell.start_timestamp).toISOString()
  : null;
const endedAt = retell.end_timestamp
  ? new Date(retell.end_timestamp).toISOString()
  : null;
const durationSeconds = retell.duration_ms
  ? Math.round(retell.duration_ms / 1000)
  : null;

// Build appointment ISO from flat AI fields
const appointmentIso = ai.appointment_date && ai.appointment_time
  ? ai.appointment_date + 'T' + ai.appointment_time + ':00'
  : null;

// Build the combined record for downstream nodes
return [{
  json: {
    // ── Identifiers (from Campaign Processor metadata) ──
    retell_call_id: retell.call_id,
    org_id: metadata.org_id,
    lead_id: metadata.lead_id,
    contact_id: metadata.contact_id,
    campaign_id: metadata.campaign_id,

    // ── Call data (from Retell) ──
    direction: retell.direction || "outbound",
    caller_phone: retell.from_number,
    callee_phone: retell.to_number,
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    recording_url: retell.recording_url || null,
    transcript_text: retell.transcript || null,
    disconnection_reason: retell.disconnection_reason || null,
    retell_agent_id: retell.agent_id,
    call_cost: retell.call_cost?.combined_cost || null,

    // ── AI analysis (from our LLM Chain — flat fields) ──
    outcome: ai.outcome,
    outcome_confidence: ai.outcome_confidence,
    ai_summary: ai.summary,
    summary_one_line: ai.summary_one_line,
    sentiment: ai.sentiment,
    engagement_level: ai.engagement_level,

    // ── Full AI analysis stored as metadata JSONB ──
    // Re-nests the flat AI fields into structured objects for DB storage
    metadata_json: {
      outcome_reasoning: ai.outcome_reasoning,
      appointment: appointmentIso ? {
        date: ai.appointment_date,
        time: ai.appointment_time,
        timezone: ai.appointment_timezone || 'America/Toronto',
        duration_minutes: ai.appointment_duration_minutes || 30,
        confirmed_by_lead: ai.appointment_confirmed_by_lead
      } : null,
      callback: ai.callback_requested_date ? {
        requested_date: ai.callback_requested_date,
        requested_time: ai.callback_requested_time,
        timezone: ai.callback_timezone,
        is_specific_time: ai.callback_is_specific_time,
        notes: ai.callback_notes
      } : null,
      financial_details: {
        current_rate: ai.financial_current_rate || null,
        desired_rate: ai.financial_desired_rate || null,
        loan_amount: ai.financial_loan_amount || null,
        property_type: ai.financial_property_type || null,
        mortgage_type: ai.financial_mortgage_type || null,
        timeline: ai.financial_timeline || null,
        other_details: ai.financial_other_details || null
      },
      objections: ai.objections || [],
      topics: ai.topics || [],
      follow_up: {
        recommended_action: ai.follow_up_recommended_action || null,
        urgency_level: ai.follow_up_urgency_level || null,
        best_contact_time: ai.follow_up_best_contact_time || null,
        lead_questions_unanswered: ai.follow_up_lead_questions_unanswered || []
      },
      compliance: {
        dnc_requested: ai.compliance_dnc_requested || false,
        profanity_detected: ai.compliance_profanity_detected || false,
        recording_consent_given: ai.compliance_recording_consent_given || null
      },
      retell_latency_p50: retell.latency?.e2e?.p50 || null,
      retell_disconnection_reason: retell.disconnection_reason || null,
      call_cost_cents: retell.call_cost?.combined_cost || null
    },

    // ── Pre-built fields for downstream nodes ──
    ai_appointment_iso: appointmentIso,
    ai_appointment_date: ai.appointment_date || null,
    ai_appointment_time: ai.appointment_time || null,
    ai_appointment_duration: ai.appointment_duration_minutes || 30,
    ai_appointment_timezone: ai.appointment_timezone || 'America/Toronto',
    ai_callback_time: ai.callback_requested_time || null,
    ai_callback_notes: ai.callback_notes || null,
    ai_follow_up_action: ai.follow_up_recommended_action || null,
    ai_dnc_requested: ai.compliance_dnc_requested || false,

    // ── Contact info (for SMS/email in outcome branches) ──
    contact_phone: retell.to_number,
    contact_name: retell.retell_llm_dynamic_variables?.first_name || "there"
  }
}];
```

**Connects to:** Update Call Record

---

### Node 8: Update Call Record

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1250, 300] |
| **On Error** | Stop workflow |
| **Retry on Fail** | Yes (3 attempts) |

> **Important:** The Campaign Processor already inserted a skeleton call record (with `retell_call_id`, `started_at`, and no outcome). This node UPDATES that existing record with the full post-call data.

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/calls?retell_call_id=eq.{{ $json.retell_call_id }}`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=representation`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "outcome": "{{ $json.outcome }}",
  "duration_seconds": {{ $json.duration_seconds || 'null' }},
  "ended_at": "{{ $json.ended_at }}",
  "recording_url": {{ $json.recording_url ? '"' + $json.recording_url + '"' : 'null' }},
  "transcript_text": {{ $json.transcript_text ? JSON.stringify($json.transcript_text) : 'null' }},
  "ai_summary": {{ JSON.stringify($json.ai_summary) }},
  "summary_one_line": {{ JSON.stringify($json.summary_one_line) }},
  "sentiment": "{{ $json.sentiment }}",
  "engagement_level": "{{ $json.engagement_level }}",
  "outcome_confidence": {{ $json.outcome_confidence }},
  "metadata": {{ JSON.stringify($json.metadata_json) }}
}
```

> **Tip:** If the expression-based JSON body is difficult to get right, use a Code node before this to build the exact JSON object, then reference `{{ JSON.stringify($json) }}` in the body.

**Alternative approach — use a Code node to build the body:**

If the expression above is too complex, add a **"Build PATCH Body"** Code node before this HTTP Request:

```javascript
const d = $input.first().json;
return [{
  json: {
    outcome: d.outcome,
    duration_seconds: d.duration_seconds,
    ended_at: d.ended_at,
    recording_url: d.recording_url,
    transcript_text: d.transcript_text,
    ai_summary: d.ai_summary,
    summary_one_line: d.summary_one_line,
    sentiment: d.sentiment,
    engagement_level: d.engagement_level,
    outcome_confidence: d.outcome_confidence,
    metadata: d.metadata_json
  }
}];
```

Then the HTTP Request body is simply: `={{ JSON.stringify($json) }}`

**Connects to:** Map Lead Status

---

### Node 9: Map Lead Status

| Property | Value |
|---|---|
| **Type** | Code |
| **Position** | [1500, 300] |
| **Mode** | Run Once for All Items |
| **Language** | JavaScript |

**Code:**

```javascript
const d = $('Build Call Record').first().json;
const outcome = d.outcome;

// Map outcome to lead status
const statusMap = {
  'booked': 'appt_set',
  'interested': 'interested',
  'callback': 'contacted',
  'voicemail': 'contacted',
  'no_answer': 'contacted',      // Was already set to "contacted" by Campaign Processor
  'not_interested': 'contacted',
  'wrong_number': 'bad_lead',
  'dnc': 'bad_lead'
};

const leadStatus = statusMap[outcome] || 'contacted';

return [{
  json: {
    ...d,
    lead_status: leadStatus,
    lead_last_call_outcome: outcome
  }
}];
```

**Connects to:** Update Lead

---

### Node 10: Update Lead

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [1750, 300] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/leads?id=eq.{{ $json.lead_id }}`
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
  "status": "{{ $json.lead_status }}",
  "last_call_outcome": "{{ $json.lead_last_call_outcome }}",
  "last_activity_at": "{{ $now.toISO() }}",
  "updated_at": "{{ $now.toISO() }}"
}
```

**Connects to:** Get Org Users

---

### Node 11: Get Org Users

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2000, 300] |
| **On Error** | Continue (using regular output) |

> We need the `user_id` for inserting notifications. This fetches all users in the org.

**Parameters:**
- Method: **GET**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/users?org_id=eq.{{ $('Build Call Record').first().json.org_id }}&select=id,phone,email,first_name`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`

**What this returns:**
```json
[
  {
    "id": "user-uuid-001",
    "phone": "+14165551111",
    "email": "broker@example.com",
    "first_name": "John"
  }
]
```

> For small orgs (typical: 1-2 users), this returns the broker(s) who should be notified. The first user's ID is used for notification inserts.

**Connects to:** Outcome Router

---

### Node 12: Outcome Router

| Property | Value |
|---|---|
| **Type** | Switch |
| **Position** | [2250, 300] |
| **Mode** | Rules |
| **Data Type** | String |
| **Value** (expression) | `{{ $('Build Call Record').first().json.outcome }}` |

**Rules (outputs):**

| Output | Rule | Operation | Value |
|---|---|---|---|
| 0 | Booked | equals | `booked` |
| 1 | Interested | equals | `interested` |
| 2 | Callback | equals | `callback` |
| 3 | DNC | equals | `dnc` |

> **Fallthrough:** Outputs that don't match any rule (voicemail, no_answer, not_interested, wrong_number) go to the default output. Leave the default output unconnected — no additional actions needed for these outcomes. The core updates (call record + lead status) were already applied.

**Output 0 (Booked) connects to:** Insert Appointment
**Output 1 (Interested) connects to:** Create Hot Lead Action Item
**Output 2 (Callback) connects to:** Create Callback Action Item
**Output 3 (DNC) connects to:** Add to DNC List

---

## BOOKED Branch

### Node 13: Insert Appointment

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2550, 0] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/appointments`
- Authentication: **Generic Credential Type** → **HTTP Header Auth** → select `Courtside V2 Supabase Service Role`
- Send Headers: **Yes**
  - `apikey`: `<YOUR_SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=representation`
- Send Body: **Yes**
- Body Content Type: **JSON**
- Specify Body: **Using JSON**

**JSON Body:**

```
={
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "lead_id": "{{ $('Build Call Record').first().json.lead_id }}",
  "contact_id": "{{ $('Build Call Record').first().json.contact_id }}",
  "campaign_id": "{{ $('Build Call Record').first().json.campaign_id }}",
  "scheduled_at": "{{ $('Build Call Record').first().json.ai_appointment_iso }}",
  "duration_minutes": {{ $('Build Call Record').first().json.ai_appointment_duration }},
  "status": "scheduled",
  "notes": {{ JSON.stringify($('Build Call Record').first().json.summary_one_line) }}
}
```

> **Calendar sync:** Inserting into `appointments` will fire a DB trigger that calls the `sync-appointment-to-calendar` Edge Function. This workflow does NOT call the calendar sync directly.

**Connects to:** Send Lead Confirmation SMS

---

### Node 14: Send Lead Confirmation SMS

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2850, 0] |
| **On Error** | Continue (using regular output) |

> Sends an SMS to the **lead** (not the broker) confirming their appointment.

**Parameters:**
- Method: **POST**
- URL: `https://api.twilio.com/2010-04-01/Accounts/YOUR_TWILIO_ACCOUNT_SID/Messages.json`
- Authentication: **Predefined Credential Type** → **Twilio API** → select `Twilio API`
- Send Body: **Yes**
- Body Content Type: **Form Urlencoded**

**Form Parameters:**

| Name | Value (expression) |
|---|---|
| `From` | `{{ $('Build Call Record').first().json.caller_phone }}` |
| `To` | `{{ $('Build Call Record').first().json.contact_phone }}` |
| `Body` | `=Hi {{ $('Build Call Record').first().json.contact_name }}, your appointment is confirmed for {{ $('Build Call Record').first().json.ai_appointment_date }} at {{ $('Build Call Record').first().json.ai_appointment_time }}. We look forward to speaking with you! Reply STOP to opt out.` |

> **Alternative:** If you have the Twilio node installed, use that instead of HTTP Request. The parameters are the same.

> **From number:** Uses the same outbound number that made the call (stored as `caller_phone` — the org's Twilio number).

**Connects to:** Send Lead Confirmation Email

---

### Node 15: Send Lead Confirmation Email

| Property | Value |
|---|---|
| **Type** | SendGrid (native node) |
| **Position** | [3150, 0] |
| **Credential** | `KC Sendgrid` |
| **On Error** | Continue (using regular output) |

> Sends a confirmation email to the **lead** via SendGrid. Only fires if the contact has an email address. Use an IF node before this if you want to conditionally skip, or let SendGrid fail gracefully.

**Parameters:**

| Parameter | Value |
|---|---|
| Resource | Mail |
| From Email | `notifications@court-side.ai` |
| From Name | `Courtside Notifications` |
| To Email | `={{ $('Build Call Record').first().json.contact_phone }}@placeholder.com` |
| Subject | `Your Appointment is Confirmed` |
| Content Type | `text/html` |
| Content | `=<h2>Appointment Confirmed</h2><p>Hi {{ $('Build Call Record').first().json.contact_name }},</p><p>Your appointment has been scheduled for <strong>{{ $('Build Call Record').first().json.ai_appointment_date }} at {{ $('Build Call Record').first().json.ai_appointment_time }}</strong>.</p><p>We look forward to speaking with you!</p><p>— Courtside AI</p>` |

> **TODO:** The lead's email address is not included in the Campaign Processor metadata. For V1, use the email from the `contacts` table. You have two options:
> 1. Add a "Get Contact Email" HTTP GET node before this (query `contacts?id=eq.CONTACT_ID&select=email`)
> 2. Have the AI extract the email from the transcript (already in the structured output as `contact_info_extracted.email`)
>
> For now, this node may fail gracefully if no email is available. That's acceptable — SMS is the primary confirmation channel.

**Connects to:** Notify Broker - Booked

---

### Node 16: Notify Broker - Booked

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [3450, 0] |
| **On Error** | Continue (using regular output) |

> Inserts a notification for each user in the org. The `deliver-notification` Edge Function (7.0) handles email/SMS delivery to the broker based on their preferences.

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/notifications`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "user_id": "{{ $('Get Org Users').first().json[0].id }}",
  "type": "appointment_booked",
  "title": "New Appointment Booked",
  "body": "{{ $('Build Call Record').first().json.contact_name }} booked an appointment for {{ $('Build Call Record').first().json.ai_appointment_date }} at {{ $('Build Call Record').first().json.ai_appointment_time }}. {{ $('Build Call Record').first().json.summary_one_line }}",
  "reference_type": "appointment",
  "reference_id": "{{ $('Insert Appointment').first().json[0]?.id || null }}"
}
```

> **Note:** `reference_id` links to the newly created appointment. Using `return=representation` on the Insert Appointment node ensures we get back the appointment's ID.

---

## INTERESTED Branch

### Node 17: Create Hot Lead Action Item

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2550, 250] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/action_items`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "contact_id": "{{ $('Build Call Record').first().json.contact_id }}",
  "lead_id": "{{ $('Build Call Record').first().json.lead_id }}",
  "type": "hot_lead",
  "title": "{{ $('Build Call Record').first().json.summary_one_line }}",
  "description": "{{ $('Build Call Record').first().json.ai_summary }}{{ $('Build Call Record').first().json.ai_follow_up_action ? '\\n\\nRecommended: ' + $('Build Call Record').first().json.ai_follow_up_action : '' }}"
}
```

**Connects to:** Notify Broker - Hot Lead

---

### Node 18: Notify Broker - Hot Lead

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2850, 250] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/notifications`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "user_id": "{{ $('Get Org Users').first().json[0].id }}",
  "type": "hot_lead_alert",
  "title": "Hot Lead: {{ $('Build Call Record').first().json.contact_name }}",
  "body": "{{ $('Build Call Record').first().json.summary_one_line }}",
  "reference_type": "lead",
  "reference_id": "{{ $('Build Call Record').first().json.lead_id }}"
}
```

---

## CALLBACK Branch

### Node 19: Create Callback Action Item

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2550, 500] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/action_items`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "contact_id": "{{ $('Build Call Record').first().json.contact_id }}",
  "lead_id": "{{ $('Build Call Record').first().json.lead_id }}",
  "type": "callback_request",
  "title": "Callback requested{{ $('Build Call Record').first().json.ai_callback_time ? ' at ' + $('Build Call Record').first().json.ai_callback_time : '' }}",
  "description": "{{ $('Build Call Record').first().json.ai_callback_notes || $('Build Call Record').first().json.ai_summary }}"
}
```

**Connects to:** Notify Broker - Callback

---

### Node 20: Notify Broker - Callback

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2850, 500] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/notifications`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "user_id": "{{ $('Get Org Users').first().json[0].id }}",
  "type": "callback_requested",
  "title": "Callback: {{ $('Build Call Record').first().json.contact_name }}",
  "body": "{{ $('Build Call Record').first().json.contact_name }} requested a callback{{ $('Build Call Record').first().json.ai_callback_time ? ' at ' + $('Build Call Record').first().json.ai_callback_time : '' }}. {{ $('Build Call Record').first().json.summary_one_line }}",
  "reference_type": "lead",
  "reference_id": "{{ $('Build Call Record').first().json.lead_id }}"
}
```

---

## DNC Branch

### Node 21: Add to DNC List

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2550, 750] |
| **On Error** | Continue (using regular output) |

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/dnc_list`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "phone": "{{ $('Build Call Record').first().json.contact_phone }}",
  "reason": "verbal_dnc",
  "source": "ai_call_analysis"
}
```

**Connects to:** DNC All Campaigns

---

### Node 22: DNC — Mark All Leads Bad

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [2850, 560] |
| **On Error** | Continue (using regular output) |

> Marks ALL leads for this contact as `bad_lead` across every campaign in the org. This ensures the contact doesn't appear as active in any campaign on the dashboard.

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/leads?contact_id=eq.{{ $('Build Call Record').first().json.contact_id }}&org_id=eq.{{ $('Build Call Record').first().json.org_id }}&status=neq.bad_lead`
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
  "status": "bad_lead",
  "last_call_outcome": "dnc",
  "updated_at": "{{ $now.toISO() }}"
}
```

**Connects to:** DNC — Mark Contact

---

### Node 23: DNC — Mark Contact

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [3100, 560] |
| **On Error** | Continue (using regular output) |

> Sets `is_dnc = true` on the contact record so the dashboard shows DNC status.

**Parameters:**
- Method: **PATCH**
- URL (expression): `=https://xkwywpqrthzownikeill.supabase.co/rest/v1/contacts?id=eq.{{ $('Build Call Record').first().json.contact_id }}`
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
  "is_dnc": true,
  "updated_at": "{{ $now.toISO() }}"
}
```

**Connects to:** DNC — Log Event

---

### Node 24: DNC — Log Event

| Property | Value |
|---|---|
| **Type** | HTTP Request |
| **Position** | [3350, 560] |
| **On Error** | Continue (using regular output) |

> Logs a `workflow_events` entry for audit trail. Optional but useful for compliance reporting.

**Parameters:**
- Method: **POST**
- URL: `https://xkwywpqrthzownikeill.supabase.co/rest/v1/workflow_events`
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
  "org_id": "{{ $('Build Call Record').first().json.org_id }}",
  "event_type": "dnc_auto_added",
  "source": "retell_post_call",
  "reference_type": "contact",
  "reference_id": "{{ $('Build Call Record').first().json.contact_id }}",
  "metadata": {
    "lead_id": "{{ $('Build Call Record').first().json.lead_id }}",
    "phone": "{{ $('Build Call Record').first().json.contact_phone }}",
    "reason": "verbal_dnc_during_call"
  }
}
```

---

## Connection Summary

| From Node | Output | To Node |
|---|---|---|
| Webhook | main[0] | Filter |
| Filter | main[0] | Analyze Call |
| OpenAI Chat Model | ai_languageModel | Analyze Call |
| Structured Output Parser | ai_outputParser | Analyze Call |
| Analyze Call | main[0] | Parse AI Output |
| Parse AI Output | main[0] | Build Call Record |
| Build Call Record | main[0] | Update Call Record |
| Update Call Record | main[0] | Map Lead Status |
| Map Lead Status | main[0] | Update Lead |
| Update Lead | main[0] | Get Org Users |
| Get Org Users | main[0] | Outcome Router |
| Outcome Router | output 0 (booked) | Insert Appointment |
| Outcome Router | output 1 (interested) | Create Hot Lead Action Item |
| Outcome Router | output 2 (callback) | Create Callback Action Item |
| Outcome Router | output 3 (dnc) | Add to DNC List |
| Insert Appointment | main[0] | Send Lead Confirmation SMS |
| Send Lead Confirmation SMS | main[0] | Send Lead Confirmation Email |
| Send Lead Confirmation Email | main[0] | Notify Broker - Booked |
| Create Hot Lead Action Item | main[0] | Notify Broker - Hot Lead |
| Create Callback Action Item | main[0] | Notify Broker - Callback |
| Add to DNC List | main[0] | DNC — Mark All Leads Bad |
| DNC — Mark All Leads Bad | main[0] | DNC — Mark Contact |
| DNC — Mark Contact | main[0] | DNC — Log Event |

---

## Testing

### Test the webhook with a simulated Retell payload

```bash
curl -X POST \
  https://n8n.courtside-ai.com/webhook-test/services/retell-post-call-outbound \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_analyzed",
    "call": {
      "call_id": "call_test_postcall_001",
      "agent_id": "agent_xxx",
      "call_type": "phone_call",
      "call_status": "ended",
      "direction": "outbound",
      "from_number": "+14165551234",
      "to_number": "+14165559876",
      "start_timestamp": 1740000000000,
      "end_timestamp": 1740000180000,
      "duration_ms": 180000,
      "recording_url": "https://example.com/recording.mp3",
      "transcript": "Agent: Hi, is this Sarah? Sarah: Yes, this is Sarah. Agent: Great, I am calling on behalf of Courtside Finance about refinancing options for your mortgage. Sarah: Oh yes, I have been thinking about refinancing. My current rate is 6.2% and I would love to get something lower. Agent: We can definitely help with that. Would you like to schedule a consultation with one of our brokers? Sarah: Sure, how about Thursday at 10:30 AM? Agent: Thursday at 10:30 AM works perfectly. I have you booked. You will receive a confirmation shortly. Sarah: Sounds great, thank you! Agent: Thank you Sarah, have a wonderful day!",
      "transcript_object": [],
      "disconnection_reason": "agent_hangup",
      "call_analysis": {},
      "call_cost": {
        "combined_cost": 45
      },
      "metadata": {
        "lead_id": "YOUR_TEST_LEAD_ID",
        "campaign_id": "YOUR_TEST_CAMPAIGN_ID",
        "org_id": "YOUR_TEST_ORG_ID",
        "contact_id": "YOUR_TEST_CONTACT_ID"
      },
      "retell_llm_dynamic_variables": {
        "first_name": "Sarah"
      },
      "latency": {
        "e2e": { "p50": 850 }
      }
    }
  }'
```

> **Note:** Use `webhook-test` (not `webhook`) for manual testing in n8n. The `-test` suffix routes to the test webhook that's active when you click "Listen for Test Event" in the n8n editor.

### Test the AI analysis independently

Pin test data on the Filter node output (use the JSON above), then manually execute from the "Analyze Call" node to verify the LLM returns valid structured output.

### Test each Supabase operation independently

**Update call record:**
```bash
curl -X PATCH \
  "https://xkwywpqrthzownikeill.supabase.co/rest/v1/calls?retell_call_id=eq.call_test_postcall_001" \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "outcome": "booked",
    "duration_seconds": 180,
    "ended_at": "2026-02-19T15:03:00.000Z",
    "recording_url": "https://example.com/recording.mp3",
    "ai_summary": "Sarah Mitchell expressed strong interest in refinancing at 6.2%. Booked Thursday 10:30 AM consultation.",
    "summary_one_line": "Refinancing interest, booked Thu 10:30 AM consult",
    "sentiment": "positive",
    "engagement_level": "high",
    "outcome_confidence": 0.95,
    "metadata": {"outcome_reasoning": "Lead explicitly agreed to Thursday 10:30 AM"}
  }'
```

**Insert appointment:**
```bash
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/rest/v1/appointments \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "org_id": "YOUR_ORG_ID",
    "lead_id": "YOUR_LEAD_ID",
    "contact_id": "YOUR_CONTACT_ID",
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "scheduled_at": "2026-02-20T10:30:00",
    "duration_minutes": 30,
    "status": "scheduled",
    "notes": "Refinancing interest, booked Thu 10:30 AM consult"
  }'
```

**Insert notification:**
```bash
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/rest/v1/notifications \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "org_id": "YOUR_ORG_ID",
    "user_id": "YOUR_USER_ID",
    "type": "appointment_booked",
    "title": "New Appointment Booked",
    "body": "Sarah Mitchell booked Thu 10:30 AM. Refinancing interest at 6.2%.",
    "reference_type": "appointment",
    "reference_id": null
  }'
```

**Insert action item (hot lead):**
```bash
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/rest/v1/action_items \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "org_id": "YOUR_ORG_ID",
    "contact_id": "YOUR_CONTACT_ID",
    "lead_id": "YOUR_LEAD_ID",
    "type": "hot_lead",
    "title": "Strong refinancing interest at 6.2%",
    "description": "Sarah Mitchell expressed strong interest in refinancing her current mortgage at 6.2%. Recommended: Prepare rate comparison sheet."
  }'
```

**Insert DNC entry:**
```bash
curl -X POST \
  https://xkwywpqrthzownikeill.supabase.co/rest/v1/dnc_list \
  -H "apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "org_id": "YOUR_ORG_ID",
    "phone": "+14165559876",
    "reason": "verbal_dnc",
    "source": "ai_call_analysis"
  }'
```

---

## Testing in n8n (Manual Execution)

1. **Build all nodes** with the configs above
2. **Click "Listen for Test Event"** on the Webhook node
3. **Send the test curl** (from the testing section above) to trigger the workflow
4. **Check each node's output** — click on each node to verify data flows correctly
5. **Pin test data** on the Filter node if you want to re-test without sending the curl again
6. **Test each outcome** by modifying the transcript in the test payload:
   - **Interested:** Change transcript to show interest but no appointment booking
   - **Callback:** "Can you call me back at 2 PM?"
   - **Voicemail:** "Hi, you've reached Sarah's voicemail..."
   - **No Answer:** Very short transcript, just ringing
   - **Not Interested:** "No thanks, I'm not interested"
   - **DNC:** "Please take me off your list"
   - **Wrong Number:** "Sorry, there's no Sarah here"
7. **Verify in Supabase:**
   - `calls` table: Check the call record was updated with outcome + AI summary
   - `leads` table: Check status was updated correctly
   - `appointments` table: Check appointment was created (booked outcome)
   - `action_items` table: Check action items were created (interested/callback)
   - `notifications` table: Check notification was inserted
   - `dnc_list` table: Check DNC entry (dnc outcome)
8. **Activate** the workflow when all outcomes test correctly

---

## Pinned Test Data

Pin this on the **Webhook** node to test without sending a real curl request:

```json
[
  {
    "headers": { "content-type": "application/json" },
    "body": {
      "event": "call_analyzed",
      "call": {
        "call_id": "call_test_001",
        "agent_id": "agent_xxx",
        "call_type": "phone_call",
        "call_status": "ended",
        "direction": "outbound",
        "from_number": "+14165551234",
        "to_number": "+14165559876",
        "start_timestamp": 1740000000000,
        "end_timestamp": 1740000180000,
        "duration_ms": 180000,
        "recording_url": "https://example.com/recording.mp3",
        "transcript": "Agent: Hi, is this Sarah? Sarah: Yes, this is Sarah. Agent: Great, I am calling on behalf of Courtside Finance about refinancing options for your mortgage. Sarah: Oh yes, I have been thinking about refinancing. My current rate is 6.2% and I would love to get something lower. Agent: We can definitely help with that. Would you like to schedule a consultation with one of our brokers? Sarah: Sure, how about Thursday at 10:30 AM? Agent: Thursday at 10:30 AM works perfectly. I have you booked. You will receive a confirmation shortly. Sarah: Sounds great, thank you! Agent: Thank you Sarah, have a wonderful day!",
        "transcript_object": [],
        "disconnection_reason": "agent_hangup",
        "call_analysis": {},
        "call_cost": { "combined_cost": 45 },
        "metadata": {
          "lead_id": "test-lead-001",
          "campaign_id": "test-campaign-001",
          "org_id": "test-org-001",
          "contact_id": "test-contact-001"
        },
        "retell_llm_dynamic_variables": { "first_name": "Sarah" },
        "latency": { "e2e": { "p50": 850 } }
      }
    }
  }
]
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Webhook never fires | Retell not configured with correct URL | Check Retell dashboard → Webhooks. URL must be `https://n8n.courtside-ai.com/webhook/services/retell-post-call-outbound` (without `-test`) |
| Filter blocks all calls | Retell event type mismatch | Check `body.event` — might be `call_ended` instead of `call_analyzed`. Adjust filter accordingly. |
| AI returns invalid JSON | Prompt or schema mismatch | Check the Parse AI Output node error. If `JSON.parse` fails, the LLM returned malformed JSON. Adjust prompt or increase temperature slightly. |
| Update Call returns empty 200 | No matching `retell_call_id` | The Campaign Processor must have created the call record first. Verify the call record exists in `calls` table. |
| Update Lead returns 404 | Invalid lead_id in metadata | Check that `metadata.lead_id` in the Retell webhook matches an actual lead in the DB. |
| SMS fails | Twilio credentials or number issue | Verify Twilio credentials, ensure `From` number is verified in Twilio, and `To` number is valid E.164. |
| Email fails | SendGrid API key or domain issue | Check SendGrid dashboard — verify sender domain (`court-side.ai`) is authenticated. |
| Notification not delivering | 7.0 not built yet | Notification INSERT will succeed (row appears in table), but email/SMS delivery depends on `deliver-notification` Edge Function + DB trigger. |
| DNC leads/contact not updating | PATCH URL filter mismatch | Verify `contact_id` and `org_id` are correct in the URL query params. Check that leads exist with `status != bad_lead`. |
| Switch has no output for outcome | Outcome not in switch rules | voicemail, no_answer, not_interested, wrong_number go to default (unconnected). This is expected — no additional actions needed. |

---

## Key Design Decisions

### Why one LLM call instead of three (like V1)?

V1 used 3 separate LLM chains: call classification, appointment extraction, and interested-lead summarization. V2 consolidates into a single call with structured output. This is:
- **Cheaper:** 1 API call instead of 3
- **Faster:** ~2-3s instead of ~6-9s
- **Simpler:** Fewer nodes, less error handling
- **Modern:** GPT-5.2 handles complex structured output well in a single call

### Why PATCH instead of INSERT for the call record?

The Campaign Processor (7.4) already INSERTs a skeleton call record when it initiates the call. This is necessary for concurrency tracking (the `get-next-campaign-leads` Edge Function counts active calls as "started in last 10 min with no outcome"). The post-call webhook UPDATEs this existing record with the full analysis.

### Why notification INSERT instead of direct SMS/email to broker?

The notification system (7.0) provides a single delivery mechanism: INSERT a row into `notifications`, and the `deliver-notification` Edge Function checks the broker's preferences and sends via the appropriate channels. This avoids duplicating delivery logic in every workflow.

### What about campaign and agent stat updates?

For V1, denormalized stats (calls_made, calls_connected, bookings) on campaigns and agents are not updated by this workflow. These can be:
1. Computed on read (query `calls` table with aggregate functions)
2. Added as additional PATCH nodes later
3. Implemented as Supabase RPC functions for atomic increments

This is a Phase 8 concern. The critical data (call record, lead status, outcome-specific automation) is handled here.

---

## Prerequisites & Dependencies

| Dependency | Status | Notes |
|---|---|---|
| Campaign Processor (7.4) | Must be active | Creates call records + sets metadata on Retell calls |
| `deliver-notification` Edge Function (7.0) | Can be built after | Notifications will be inserted but not delivered until 7.0 is live |
| `sync-appointment-to-calendar` DB trigger (7.5) | Can be built after | Appointments will be created but not synced to calendar until 7.5 is live |
| Supabase call record exists | Required | The PATCH on `calls` will silently fail if no matching `retell_call_id` exists |
| OpenAI API key | Required | For the AI analysis LLM chain |
| Twilio credentials | Required for Booked branch | SMS confirmation to leads |
| SendGrid API key (`KC Sendgrid`) | Required for Booked branch | Email confirmation to leads |

---

*Last updated: 2026-02-19*
