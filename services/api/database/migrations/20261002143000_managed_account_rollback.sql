CREATE OR REPLACE FUNCTION public.rollback_managed_user(p_auth_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  app_user_id uuid;
BEGIN
  SELECT id INTO app_user_id FROM public.users WHERE auth_id = p_auth_id;
  IF app_user_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.students WHERE user_id = app_user_id;
  DELETE FROM public.staff WHERE user_id = app_user_id;
  DELETE FROM public.users WHERE id = app_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_managed_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_managed_user(uuid) TO service_role;
