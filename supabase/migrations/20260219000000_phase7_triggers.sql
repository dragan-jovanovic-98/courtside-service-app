-- ============================================================================
-- Phase 7.0: DB Triggers for Notification Delivery & Calendar Sync
-- ============================================================================
--
-- This migration creates:
--   1. pg_net extension (async HTTP from triggers)
--   2. Trigger function + trigger on `notifications` → calls `deliver-notification` Edge Function
--   3. Trigger function + trigger on `appointments` → calls `sync-appointment-to-calendar` Edge Function
--
-- PREREQUISITE: Store the service role key in Supabase Vault so triggers can
-- authenticate with Edge Functions. Run this ONCE in the SQL editor:
--
--   SELECT vault.create_secret(
--     '<YOUR_SERVICE_ROLE_KEY>',
--     'service_role_key',
--     'Service role key for DB trigger → Edge Function auth'
--   );
--
-- ALTERNATIVE: If you prefer not to use Vault, skip this migration and
-- configure Database Webhooks via the Supabase Dashboard instead:
--   Database → Webhooks → Create → point at your Edge Function URLs.
--   Both approaches achieve the same result.
-- ============================================================================

-- 1. Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- 2. Notification delivery trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _service_key text;
  _base_url text;
  _payload jsonb;
BEGIN
  -- Read service role key from Vault
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE WARNING 'handle_notification_insert: service_role_key not found in vault — skipping delivery';
    RETURN NEW;
  END IF;

  -- Build the Supabase Functions URL
  _base_url := current_setting('app.settings.supabase_url', true);
  IF _base_url IS NULL OR _base_url = '' THEN
    -- Fallback: construct from project ref
    _base_url := 'https://xkwywpqrthzownikeill.supabase.co';
  END IF;

  _payload := jsonb_build_object(
    'type', 'INSERT',
    'record', jsonb_build_object(
      'id',             NEW.id,
      'org_id',         NEW.org_id,
      'user_id',        NEW.user_id,
      'type',           NEW.type,
      'title',          NEW.title,
      'body',           NEW.body,
      'reference_type', NEW.reference_type,
      'reference_id',   NEW.reference_id,
      'is_read',        NEW.is_read,
      'created_at',     NEW.created_at
    )
  );

  -- Fire-and-forget HTTP POST to the Edge Function
  PERFORM net.http_post(
    url     := _base_url || '/functions/v1/deliver-notification',
    body    := _payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notification_insert
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION handle_notification_insert();

-- ============================================================================
-- 3. Appointment calendar sync trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _service_key text;
  _base_url text;
  _action text;
  _appointment_id uuid;
  _payload jsonb;
BEGIN
  -- Read service role key from Vault
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE WARNING 'handle_appointment_change: service_role_key not found in vault — skipping sync';
    RETURN COALESCE(NEW, OLD);
  END IF;

  _base_url := current_setting('app.settings.supabase_url', true);
  IF _base_url IS NULL OR _base_url = '' THEN
    _base_url := 'https://xkwywpqrthzownikeill.supabase.co';
  END IF;

  -- Determine action and appointment ID
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _appointment_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _appointment_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _appointment_id := OLD.id;
  END IF;

  _payload := jsonb_build_object(
    'appointment_id', _appointment_id,
    'action',         _action
  );

  PERFORM net.http_post(
    url     := _base_url || '/functions/v1/sync-appointment-to-calendar',
    body    := _payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_appointment_change
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_change();
