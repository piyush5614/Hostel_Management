BEGIN;

ALTER TABLE public.gate_movements
  DROP CONSTRAINT IF EXISTS gate_movements_scanned_by_role_check;

ALTER TABLE public.gate_movements
  ADD CONSTRAINT gate_movements_scanned_by_role_check
  CHECK (scanned_by_role IN ('student', 'staff', 'warden', 'admin'));

ALTER TABLE public.gate_movement_events
  DROP CONSTRAINT IF EXISTS gate_movement_events_event_type_check;

ALTER TABLE public.gate_movement_events
  ADD CONSTRAINT gate_movement_events_event_type_check
  CHECK (event_type IN (
    'scanned',
    'request_started',
    'reason_submitted',
    'approved',
    'rejected',
    'expired',
    'returned',
    'cancelled',
    'qr_regenerated'
  ));

CREATE OR REPLACE FUNCTION public.gate_request_movement(
  p_college_id text,
  p_student_id uuid,
  p_student_user_id uuid,
  p_student_name text,
  p_enrollment_no text,
  p_room_number text,
  p_hostel_block text,
  p_mobile_number text,
  p_course_year text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  active_movement public.gate_movements%ROWTYPE;
  created_movement public.gate_movements%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.students
     WHERE id = p_student_id
       AND college_id = p_college_id
       AND user_id = p_student_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'NOT_YOUR_PROFILE');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_college_id || ':' || p_student_id::text, 0));

  WITH expired AS (
    UPDATE public.gate_movements
       SET status = 'EXPIRED'
     WHERE college_id = p_college_id
       AND student_id = p_student_id
       AND status = 'PENDING_REASON'
       AND scanned_at <= now() - interval '5 minutes'
     RETURNING id, college_id
  )
  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  SELECT id, college_id, 'expired', NULL, 'system', '{}'::jsonb FROM expired;

  SELECT *
    INTO active_movement
    FROM public.gate_movements
   WHERE college_id = p_college_id
     AND student_id = p_student_id
     AND status IN ('PENDING_REASON', 'PENDING_APPROVAL', 'OUT')
   FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object('error', 'ACTIVE_MOVEMENT', 'movement', to_jsonb(active_movement));
  END IF;

  INSERT INTO public.gate_movements (
    college_id, student_id, status, scanned_by, scanned_by_role,
    student_name, enrollment_no, room_number, hostel_block, mobile_number, course_year
  )
  VALUES (
    p_college_id, p_student_id, 'PENDING_REASON', p_student_user_id, 'student',
    p_student_name, p_enrollment_no, p_room_number, p_hostel_block, p_mobile_number, p_course_year
  )
  RETURNING * INTO created_movement;

  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    created_movement.id,
    p_college_id,
    'request_started',
    p_student_user_id,
    'student',
    '{}'::jsonb
  );

  RETURN jsonb_build_object('movement', to_jsonb(created_movement), 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.gate_scan_movement(
  p_college_id text,
  p_student_id uuid,
  p_student_user_id uuid,
  p_scanned_by uuid,
  p_scanned_by_role text,
  p_student_name text,
  p_enrollment_no text,
  p_room_number text,
  p_hostel_block text,
  p_mobile_number text,
  p_course_year text,
  p_manual_entry boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_movement public.gate_movements%ROWTYPE;
BEGIN
  IF p_scanned_by_role NOT IN ('staff', 'warden', 'admin') THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_college_id || ':' || p_student_id::text, 0));

  WITH expired AS (
    UPDATE public.gate_movements
       SET status = 'EXPIRED'
     WHERE college_id = p_college_id
       AND student_id = p_student_id
       AND status = 'PENDING_REASON'
       AND scanned_at <= now() - interval '5 minutes'
     RETURNING id, college_id
  )
  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  SELECT id, college_id, 'expired', NULL, 'system', '{}'::jsonb FROM expired;

  SELECT *
    INTO current_movement
    FROM public.gate_movements
   WHERE college_id = p_college_id
     AND student_id = p_student_id
     AND status IN ('PENDING_REASON', 'PENDING_APPROVAL', 'OUT')
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NO_PENDING_REQUEST');
  END IF;

  IF current_movement.status = 'OUT' THEN
    UPDATE public.gate_movements
       SET status = 'RETURNED',
           in_time = now(),
           return_scanned_by = p_scanned_by
     WHERE id = current_movement.id
     RETURNING * INTO current_movement;

    INSERT INTO public.gate_movement_events
      (movement_id, college_id, event_type, actor_id, actor_role, metadata)
    VALUES (
      current_movement.id,
      p_college_id,
      'returned',
      p_scanned_by,
      p_scanned_by_role,
      jsonb_build_object('manualEntry', p_manual_entry)
    );

    RETURN jsonb_build_object(
      'movement', to_jsonb(current_movement),
      'studentUserId', p_student_user_id,
      'created', false,
      'returned', true
    );
  END IF;

  UPDATE public.gate_movements
     SET scanned_by = p_scanned_by,
         scanned_by_role = p_scanned_by_role
   WHERE id = current_movement.id
   RETURNING * INTO current_movement;

  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    current_movement.id,
    p_college_id,
    'scanned',
    p_scanned_by,
    p_scanned_by_role,
    jsonb_build_object('manualEntry', p_manual_entry, 'requestVerified', true)
  );

  RETURN jsonb_build_object(
    'movement', to_jsonb(current_movement),
    'studentUserId', p_student_user_id,
    'created', false,
    'returned', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gate_request_movement(text, uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gate_request_movement(text, uuid, uuid, text, text, text, text, text, text) TO service_role;

COMMIT;
