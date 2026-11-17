CREATE OR REPLACE FUNCTION public.provision_warden_managed_user(
  p_college_id text,
  p_name text,
  p_email text,
  p_generated_id text,
  p_password_hash text,
  p_profile jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_user public.users;
  app_profile jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.colleges WHERE id = p_college_id) THEN
    RAISE EXCEPTION 'College does not exist' USING ERRCODE = '23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE college_id = p_college_id
      AND (lower(email) = lower(p_email) OR lower(generated_id) = lower(p_generated_id))
  ) THEN
    RAISE EXCEPTION 'Account ID already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.users (
    id, auth_id, college_id, name, email, password, role, generated_id, is_active
  ) VALUES (
    gen_random_uuid(), NULL, p_college_id, p_name, lower(p_email), p_password_hash,
    'warden', p_generated_id, true
  )
  RETURNING * INTO app_user;

  INSERT INTO public.staff (
    college_id, user_id, employee_id, position, department, contact_number,
    address, joining_date, shift_timing, is_active
  ) VALUES (
    p_college_id, app_user.id, p_generated_id, p_profile->>'position',
    p_profile->>'department', p_profile->>'contact_number', p_profile->>'address',
    coalesce(nullif(p_profile->>'joining_date', '')::date, current_date),
    coalesce(nullif(p_profile->>'shift_timing', ''), '08:00-16:00'), true
  )
  RETURNING to_jsonb(staff.*) INTO app_profile;

  RETURN jsonb_build_object('user', to_jsonb(app_user), 'profile', app_profile);
END;
$$;

REVOKE ALL ON FUNCTION public.provision_warden_managed_user(text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_warden_managed_user(text, text, text, text, text, jsonb)
  TO service_role;
