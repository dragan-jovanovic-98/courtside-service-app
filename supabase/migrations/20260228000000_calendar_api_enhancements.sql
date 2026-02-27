-- Calendar API enhancements migration
-- Adds scheduling settings for AI agent calendar integration

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
-- (calendar_event_id and calendar_provider already exist on appointments)

-- Add index for fast appointment lookups by date range
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at_org
  ON appointments (org_id, scheduled_at)
  WHERE status != 'cancelled';
