-- Phase 11.3: CRM Activity Pushback Triggers
-- Fires crm-push-activity Edge Function when:
--   1. A call is inserted (for CRM-linked contacts)
--   2. An appointment is inserted (for CRM-linked contacts)
-- Each trigger checks that the contact has a crm_record_id before firing.

-- ============================================================================
-- 1. Shared helper: check if contact is CRM-linked and org has connected CRM
-- ============================================================================

CREATE OR REPLACE FUNCTION should_push_crm_activity(
  _contact_id uuid,
  _org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _has_crm_link boolean;
  _has_crm_integration boolean;
BEGIN
  -- Check contact has CRM record ID
  SELECT EXISTS (
    SELECT 1 FROM contacts
    WHERE id = _contact_id
      AND crm_record_id IS NOT NULL
      AND crm_provider IS NOT NULL
  ) INTO _has_crm_link;

  IF NOT _has_crm_link THEN
    RETURN false;
  END IF;

  -- Check org has connected CRM integration
  SELECT EXISTS (
    SELECT 1 FROM integrations
    WHERE org_id = _org_id
      AND service_type = 'crm'
      AND status = 'connected'
  ) INTO _has_crm_integration;

  RETURN _has_crm_integration;
END;
$$;

-- ============================================================================
-- 2. Call activity trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_call_crm_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _service_key text;
  _base_url text;
  _payload jsonb;
BEGIN
  -- Skip if no contact_id
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check CRM eligibility
  IF NOT should_push_crm_activity(NEW.contact_id, NEW.org_id) THEN
    RETURN NEW;
  END IF;

  -- Read service role key from Vault
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE WARNING 'handle_call_crm_push: service_role_key not found in vault — skipping CRM push';
    RETURN NEW;
  END IF;

  _base_url := current_setting('app.settings.supabase_url', true);
  IF _base_url IS NULL OR _base_url = '' THEN
    _base_url := 'https://xkwywpqrthzownikeill.supabase.co';
  END IF;

  _payload := jsonb_build_object(
    'activity_type', 'call',
    'record_id',     NEW.id,
    'org_id',        NEW.org_id,
    'contact_id',    NEW.contact_id
  );

  PERFORM net.http_post(
    url     := _base_url || '/functions/v1/crm-push-activity',
    body    := _payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_call_crm_push
  AFTER INSERT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION handle_call_crm_push();

-- ============================================================================
-- 3. Appointment activity trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_appointment_crm_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _service_key text;
  _base_url text;
  _payload jsonb;
BEGIN
  -- Skip if no contact_id (manual appointments may not have one)
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check CRM eligibility
  IF NOT should_push_crm_activity(NEW.contact_id, NEW.org_id) THEN
    RETURN NEW;
  END IF;

  -- Read service role key from Vault
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE WARNING 'handle_appointment_crm_push: service_role_key not found in vault — skipping CRM push';
    RETURN NEW;
  END IF;

  _base_url := current_setting('app.settings.supabase_url', true);
  IF _base_url IS NULL OR _base_url = '' THEN
    _base_url := 'https://xkwywpqrthzownikeill.supabase.co';
  END IF;

  _payload := jsonb_build_object(
    'activity_type', 'appointment',
    'record_id',     NEW.id,
    'org_id',        NEW.org_id,
    'contact_id',    NEW.contact_id
  );

  PERFORM net.http_post(
    url     := _base_url || '/functions/v1/crm-push-activity',
    body    := _payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_crm_push
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_crm_push();
