-- Change default country to CA
ALTER TABLE organizations ALTER COLUMN country SET DEFAULT 'CA';

-- Update handle_new_signup to accept country
CREATE OR REPLACE FUNCTION public.handle_new_signup(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_org_name text,
  p_country text DEFAULT 'CA'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, country)
  VALUES (p_org_name, COALESCE(p_country, 'CA'))
  RETURNING id INTO v_org_id;

  -- Create user record with owner role
  INSERT INTO users (id, org_id, first_name, last_name, email, role, status)
  VALUES (p_user_id, v_org_id, p_first_name, p_last_name, p_email, 'owner', 'active');

  -- Create default notification preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (p_user_id);

  -- Create default compliance settings
  INSERT INTO compliance_settings (org_id)
  VALUES (v_org_id);

  RETURN json_build_object('org_id', v_org_id);
END;
$function$;
