-- Repair legacy managed accounts that were seeded into users without profiles.
-- Students and Staff authenticate with application-managed credentials, so each
-- managed user must have exactly one corresponding profile row.

INSERT INTO public.students (college_id, user_id, enrollment_number, current_status)
SELECT u.college_id, u.id, u.generated_id, 'present'
FROM public.users AS u
WHERE u.role = 'student'
  AND NOT EXISTS (
    SELECT 1
    FROM public.students AS s
    WHERE s.college_id = u.college_id
      AND s.user_id = u.id
  );

INSERT INTO public.staff (college_id, user_id, employee_id, position, department, is_active)
SELECT u.college_id, u.id, u.generated_id, 'Staff', 'General', true
FROM public.users AS u
WHERE u.role = 'staff'
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff AS s
    WHERE s.college_id = u.college_id
      AND s.user_id = u.id
  );
