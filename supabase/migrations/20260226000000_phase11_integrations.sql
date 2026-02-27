-- Phase 11.0: Calendar & CRM Integrations — Database Migration
-- Creates new tables, adds columns to existing tables, sets up RLS and indexes.

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- 1a. calendar_connections
-- Represents a specific calendar within a connected calendar account.
CREATE TABLE IF NOT EXISTS calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google' or 'outlook'
  provider_calendar_id text NOT NULL,
  calendar_name text NOT NULL,
  color text, -- hex color for display
  is_enabled_for_display boolean NOT NULL DEFAULT false,
  sync_direction text NOT NULL DEFAULT 'none', -- 'pull' or 'none'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, provider_calendar_id)
);

-- 1b. campaign_appointment_schedules
-- Per-day appointment availability windows for a campaign.
CREATE TABLE IF NOT EXISTS campaign_appointment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Mon, 6=Sun
  enabled boolean NOT NULL DEFAULT true,
  slots jsonb NOT NULL DEFAULT '[{"start": "09:00", "end": "17:00"}]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1c. calendar_blocks
-- Time blocks on the calendar page (cosmetic, not synced, don't affect availability).
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1d. crm_activity_log
-- Tracks activities pushed to the CRM for debugging and sync health.
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  crm_provider text NOT NULL, -- 'hubspot', etc.
  activity_type text NOT NULL, -- 'call', 'sms_sent', 'sms_received', 'email', 'appointment'
  crm_engagement_id text, -- ID returned by CRM after creation
  status text NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'pending'
  payload jsonb, -- data sent to CRM
  error_message text, -- error details if failed
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. MODIFY EXISTING TABLES
-- ============================================================

-- 2a. contacts — Add CRM fields
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS crm_provider text,
  ADD COLUMN IF NOT EXISTS crm_record_id text;

-- 2b. campaigns — Add calendar connection reference
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS calendar_connection_id uuid REFERENCES calendar_connections(id) ON DELETE SET NULL;

-- 2c. appointments — Add calendar connection, sync status, manual flag, title
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS calendar_connection_id uuid REFERENCES calendar_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text;

-- 2d. appointments — Make lead_id, contact_id, campaign_id nullable (for manual appointments)
ALTER TABLE appointments
  ALTER COLUMN lead_id DROP NOT NULL,
  ALTER COLUMN contact_id DROP NOT NULL,
  ALTER COLUMN campaign_id DROP NOT NULL;

-- 2e. integrations — Add account email and service type
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS account_email text,
  ADD COLUMN IF NOT EXISTS service_type text; -- 'calendar' or 'crm'

-- 2f. leads — Add import source tracking
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS import_source text; -- 'csv', 'crm', 'manual'


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

-- 3a. calendar_connections RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_connections_select" ON calendar_connections
  FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_connections_insert" ON calendar_connections
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_connections_update" ON calendar_connections
  FOR UPDATE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_connections_delete" ON calendar_connections
  FOR DELETE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 3b. campaign_appointment_schedules RLS
-- Uses campaign's org_id through a join (same pattern as campaign_schedules)
ALTER TABLE campaign_appointment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_appt_schedules_select" ON campaign_appointment_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_appointment_schedules.campaign_id
      AND campaigns.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_appt_schedules_insert" ON campaign_appointment_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_appointment_schedules.campaign_id
      AND campaigns.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_appt_schedules_update" ON campaign_appointment_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_appointment_schedules.campaign_id
      AND campaigns.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_appointment_schedules.campaign_id
      AND campaigns.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "campaign_appt_schedules_delete" ON campaign_appointment_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_appointment_schedules.campaign_id
      AND campaigns.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    )
  );

-- 3c. calendar_blocks RLS
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_blocks_select" ON calendar_blocks
  FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_blocks_insert" ON calendar_blocks
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_blocks_update" ON calendar_blocks
  FOR UPDATE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "calendar_blocks_delete" ON calendar_blocks
  FOR DELETE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 3d. crm_activity_log RLS
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activity_log_select" ON crm_activity_log
  FOR SELECT USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "crm_activity_log_insert" ON crm_activity_log
  FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "crm_activity_log_update" ON crm_activity_log
  FOR UPDATE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "crm_activity_log_delete" ON crm_activity_log
  FOR DELETE USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- calendar_connections
CREATE INDEX idx_calendar_connections_org ON calendar_connections(org_id);
CREATE INDEX idx_calendar_connections_integration ON calendar_connections(integration_id);

-- campaign_appointment_schedules
CREATE INDEX idx_campaign_appt_schedules_campaign ON campaign_appointment_schedules(campaign_id);

-- calendar_blocks
CREATE INDEX idx_calendar_blocks_org_dates ON calendar_blocks(org_id, starts_at, ends_at);

-- crm_activity_log
CREATE INDEX idx_crm_activity_log_org ON crm_activity_log(org_id);
CREATE INDEX idx_crm_activity_log_contact ON crm_activity_log(contact_id);
CREATE INDEX idx_crm_activity_log_status ON crm_activity_log(org_id, status);

-- New FK columns on existing tables
CREATE INDEX idx_campaigns_calendar_connection ON campaigns(calendar_connection_id);
CREATE INDEX idx_appointments_calendar_connection ON appointments(calendar_connection_id);
CREATE INDEX idx_appointments_sync_status ON appointments(org_id, sync_status);
CREATE INDEX idx_contacts_crm ON contacts(org_id, crm_provider);
CREATE INDEX idx_leads_import_source ON leads(org_id, import_source);

-- updated_at trigger function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at trigger for calendar_connections
CREATE TRIGGER set_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
