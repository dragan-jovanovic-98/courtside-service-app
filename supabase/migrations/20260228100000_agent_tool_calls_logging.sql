-- Agent tool call logging for analytics & debugging
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  call_id uuid REFERENCES calls(id),
  campaign_id uuid REFERENCES campaigns(id),
  lead_id uuid REFERENCES leads(id),
  tool_name text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb NOT NULL DEFAULT '{}',
  duration_ms integer,
  calendar_provider text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by org + time range (analytics dashboards)
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_org_created
  ON agent_tool_calls (org_id, created_at DESC);

-- Index for querying by call (debugging a specific call)
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_call
  ON agent_tool_calls (call_id)
  WHERE call_id IS NOT NULL;

-- Index for error monitoring
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_errors
  ON agent_tool_calls (org_id, created_at DESC)
  WHERE error IS NOT NULL;

-- RLS
ALTER TABLE agent_tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_tool_calls_org_isolation" ON agent_tool_calls
  FOR ALL
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Service role can always insert (agent endpoints use service key)
CREATE POLICY "agent_tool_calls_service_insert" ON agent_tool_calls
  FOR INSERT
  WITH CHECK (true);
