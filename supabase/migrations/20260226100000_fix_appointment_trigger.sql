-- Phase 11.2: Update appointment calendar sync trigger
-- Changes:
--   1. Detect status='cancelled' on UPDATE and map to 'delete' action
--   2. Skip trigger when calendar_connection_id IS NULL (no external sync needed)

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
  _calendar_connection_id uuid;
  _payload jsonb;
BEGIN
  -- Determine the relevant calendar_connection_id
  IF TG_OP = 'DELETE' THEN
    _calendar_connection_id := OLD.calendar_connection_id;
    _appointment_id := OLD.id;
  ELSE
    _calendar_connection_id := NEW.calendar_connection_id;
    _appointment_id := NEW.id;
  END IF;

  -- Skip if no calendar connection (Courtside-only appointments don't need external sync)
  IF _calendar_connection_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect cancellation as a delete action
    IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
      _action := 'delete';
    ELSE
      _action := 'update';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
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
