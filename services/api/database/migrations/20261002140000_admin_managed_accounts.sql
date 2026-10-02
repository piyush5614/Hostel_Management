ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS qualifications text,
  ADD COLUMN IF NOT EXISTS medical_notes text,
  ADD COLUMN IF NOT EXISTS profile_image text;

CREATE UNIQUE INDEX IF NOT EXISTS users_one_admin_per_college
  ON public.users (college_id)
  WHERE role = 'admin';

CREATE OR REPLACE FUNCTION public.provision_managed_user(
  p_auth_id uuid,
  p_college_id text,
  p_name text,
  p_email text,
  p_role text,
  p_generated_id text,
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
  existing_user public.users;
BEGIN
  IF p_role NOT IN ('admin', 'staff', 'student') THEN
    RAISE EXCEPTION 'Unsupported account role' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.colleges WHERE id = p_college_id) THEN
    RAISE EXCEPTION 'College does not exist' USING ERRCODE = '23503';
  END IF;

  IF p_role = 'admin' AND EXISTS (
    SELECT 1 FROM public.users
    WHERE college_id = p_college_id AND role = 'admin' AND auth_id IS DISTINCT FROM p_auth_id
  ) THEN
    RAISE EXCEPTION 'An admin already exists for this college' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO existing_user
  FROM public.users
  WHERE college_id = p_college_id
    AND (lower(email) = lower(p_email) OR (p_generated_id IS NOT NULL AND generated_id = p_generated_id))
  LIMIT 1;

  IF existing_user.id IS NOT NULL THEN
    IF existing_user.auth_id IS NOT NULL AND existing_user.auth_id <> p_auth_id THEN
      RAISE EXCEPTION 'Account ID already exists' USING ERRCODE = '23505';
    END IF;

    UPDATE public.users
    SET auth_id = p_auth_id,
        password = NULL,
        name = p_name,
        email = lower(p_email),
        role = p_role,
        generated_id = p_generated_id,
        is_active = true,
        updated_at = now()
    WHERE id = existing_user.id
    RETURNING * INTO app_user;
  ELSE
    INSERT INTO public.users (
      id, auth_id, college_id, name, email, password, role, generated_id, is_active
    ) VALUES (
      p_auth_id, p_auth_id, p_college_id, p_name, lower(p_email), NULL, p_role, p_generated_id, true
    )
    RETURNING * INTO app_user;
  END IF;

  IF p_role = 'student' THEN
    INSERT INTO public.students (
      college_id, user_id, enrollment_number, course, year, gender, date_of_birth,
      contact_number, address, guardian_name, guardian_contact, emergency_contact,
      medical_notes, room_id, bed_id, profile_image, parent_image_1, parent_image_2,
      joining_date, current_status
    ) VALUES (
      p_college_id, app_user.id, p_profile->>'enrollment_number', p_profile->>'course',
      nullif(p_profile->>'year', '')::integer, p_profile->>'gender',
      nullif(p_profile->>'date_of_birth', '')::date, p_profile->>'contact_number',
      p_profile->>'address', p_profile->>'guardian_name', p_profile->>'guardian_contact',
      p_profile->>'emergency_contact', p_profile->>'medical_notes',
      nullif(p_profile->>'room_id', '')::uuid, nullif(p_profile->>'bed_id', '')::uuid,
      p_profile->>'profile_image', p_profile->>'parent_image_1', p_profile->>'parent_image_2',
      coalesce(nullif(p_profile->>'joining_date', '')::date, current_date), 'present'
    )
    ON CONFLICT (college_id, user_id) DO UPDATE SET
      enrollment_number = EXCLUDED.enrollment_number,
      course = EXCLUDED.course,
      year = EXCLUDED.year,
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      contact_number = EXCLUDED.contact_number,
      address = EXCLUDED.address,
      guardian_name = EXCLUDED.guardian_name,
      guardian_contact = EXCLUDED.guardian_contact,
      emergency_contact = EXCLUDED.emergency_contact,
      medical_notes = EXCLUDED.medical_notes,
      room_id = EXCLUDED.room_id,
      bed_id = EXCLUDED.bed_id,
      profile_image = EXCLUDED.profile_image,
      parent_image_1 = EXCLUDED.parent_image_1,
      parent_image_2 = EXCLUDED.parent_image_2,
      joining_date = EXCLUDED.joining_date
    RETURNING to_jsonb(students.*) INTO app_profile;
  ELSIF p_role = 'staff' THEN
    INSERT INTO public.staff (
      college_id, user_id, employee_id, position, department, contact_number,
      address, joining_date, shift_timing, is_active, gender, date_of_birth,
      emergency_contact, qualifications, medical_notes, profile_image
    ) VALUES (
      p_college_id, app_user.id, p_generated_id, p_profile->>'position',
      p_profile->>'department', p_profile->>'contact_number', p_profile->>'address',
      coalesce(nullif(p_profile->>'joining_date', '')::date, current_date),
      coalesce(nullif(p_profile->>'shift_timing', ''), '08:00-16:00'), true,
      p_profile->>'gender', nullif(p_profile->>'date_of_birth', '')::date,
      p_profile->>'emergency_contact', p_profile->>'qualifications',
      p_profile->>'medical_notes', p_profile->>'profile_image'
    )
    ON CONFLICT (college_id, user_id) DO UPDATE SET
      employee_id = EXCLUDED.employee_id,
      position = EXCLUDED.position,
      department = EXCLUDED.department,
      contact_number = EXCLUDED.contact_number,
      address = EXCLUDED.address,
      joining_date = EXCLUDED.joining_date,
      shift_timing = EXCLUDED.shift_timing,
      is_active = true,
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      emergency_contact = EXCLUDED.emergency_contact,
      qualifications = EXCLUDED.qualifications,
      medical_notes = EXCLUDED.medical_notes,
      profile_image = EXCLUDED.profile_image
    RETURNING to_jsonb(staff.*) INTO app_profile;
  END IF;

  RETURN jsonb_build_object('user', to_jsonb(app_user), 'profile', app_profile);
END;
$$;

REVOKE ALL ON FUNCTION public.provision_managed_user(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_managed_user(uuid, text, text, text, text, text, jsonb) TO service_role;
