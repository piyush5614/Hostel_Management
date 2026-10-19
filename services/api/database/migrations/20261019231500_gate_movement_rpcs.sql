BEGIN;

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
  created_movement public.gate_movements%ROWTYPE;
  event_name text;
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
     RETURNING id, college_id, scanned_by, scanned_by_role
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

  IF FOUND THEN
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

    RETURN jsonb_build_object(
      'movement', to_jsonb(current_movement),
      'studentUserId', p_student_user_id,
      'created', false,
      'returned', false
    );
  END IF;

  INSERT INTO public.gate_movements (
    college_id, student_id, status, scanned_by, scanned_by_role,
    student_name, enrollment_no, room_number, hostel_block, mobile_number, course_year
  )
  VALUES (
    p_college_id, p_student_id, 'PENDING_REASON', p_scanned_by, p_scanned_by_role,
    p_student_name, p_enrollment_no, p_room_number, p_hostel_block, p_mobile_number, p_course_year
  )
  RETURNING * INTO created_movement;

  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    created_movement.id,
    p_college_id,
    'scanned',
    p_scanned_by,
    p_scanned_by_role,
    jsonb_build_object('manualEntry', p_manual_entry)
  );

  RETURN jsonb_build_object(
    'movement', to_jsonb(created_movement),
    'studentUserId', p_student_user_id,
    'created', true,
    'returned', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.gate_transition_movement(
  p_college_id text,
  p_movement_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_reason text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_movement public.gate_movements%ROWTYPE;
  updated_movement public.gate_movements%ROWTYPE;
  student_user_id uuid;
  event_name text;
BEGIN
  SELECT *
    INTO current_movement
    FROM public.gate_movements
   WHERE id = p_movement_id
     AND college_id = p_college_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  IF p_action = 'reason' THEN
    SELECT user_id INTO student_user_id
      FROM public.students
     WHERE id = current_movement.student_id
       AND college_id = p_college_id;

    IF p_actor_role <> 'student' OR student_user_id IS DISTINCT FROM p_actor_id THEN
      RETURN jsonb_build_object('error', 'NOT_YOUR_REQUEST');
    END IF;

    IF current_movement.status = 'PENDING_REASON'
       AND current_movement.scanned_at <= now() - interval '5 minutes' THEN
      UPDATE public.gate_movements
         SET status = 'EXPIRED'
       WHERE id = p_movement_id
       RETURNING * INTO updated_movement;

      INSERT INTO public.gate_movement_events
        (movement_id, college_id, event_type, actor_id, actor_role, metadata)
      VALUES (p_movement_id, p_college_id, 'expired', NULL, 'system', '{}'::jsonb);

      RETURN jsonb_build_object('error', 'REQUEST_EXPIRED', 'movement', to_jsonb(updated_movement));
    END IF;

    IF current_movement.status <> 'PENDING_REASON' THEN
      RETURN jsonb_build_object('error', 'INVALID_TRANSITION');
    END IF;

    UPDATE public.gate_movements
       SET status = 'PENDING_APPROVAL',
           reason = p_reason,
           reason_category = p_category,
           reason_submitted_at = now()
     WHERE id = p_movement_id
     RETURNING * INTO updated_movement;

    event_name := 'reason_submitted';
  ELSIF p_action IN ('approve', 'reject', 'cancel') THEN
    IF p_actor_role <> 'admin'
       AND (p_actor_id IS DISTINCT FROM current_movement.scanned_by
            OR p_actor_role NOT IN ('staff', 'warden')) THEN
      RETURN jsonb_build_object('error', 'NOT_YOUR_REQUEST');
    END IF;

    IF p_action IN ('approve', 'reject') AND current_movement.status <> 'PENDING_APPROVAL' THEN
      RETURN jsonb_build_object('error', 'INVALID_TRANSITION');
    END IF;

    IF p_action = 'cancel'
       AND current_movement.status NOT IN ('PENDING_REASON', 'PENDING_APPROVAL') THEN
      RETURN jsonb_build_object('error', 'INVALID_TRANSITION');
    END IF;

    IF p_action = 'approve' THEN
      UPDATE public.gate_movements
         SET status = 'OUT',
             approved_by = p_actor_id,
             approved_at = now(),
             out_time = now()
       WHERE id = p_movement_id
       RETURNING * INTO updated_movement;
      event_name := 'approved';
    ELSIF p_action = 'reject' THEN
      UPDATE public.gate_movements
         SET status = 'REJECTED',
             approved_by = p_actor_id,
             approved_at = now(),
             rejection_note = p_note
       WHERE id = p_movement_id
       RETURNING * INTO updated_movement;
      event_name := 'rejected';
    ELSE
      UPDATE public.gate_movements
         SET status = 'CANCELLED'
       WHERE id = p_movement_id
       RETURNING * INTO updated_movement;
      event_name := 'cancelled';
    END IF;
  ELSE
    RETURN jsonb_build_object('error', 'INVALID_ACTION');
  END IF;

  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    p_movement_id,
    p_college_id,
    event_name,
    p_actor_id,
    p_actor_role,
    CASE
      WHEN p_action = 'reason' THEN jsonb_build_object('category', p_category)
      WHEN p_action = 'reject' THEN jsonb_build_object('note', p_note)
      ELSE '{}'::jsonb
    END
  );

  RETURN jsonb_build_object('movement', to_jsonb(updated_movement));
END;
$$;

CREATE OR REPLACE FUNCTION public.gate_expire_pending_reason(p_college_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  expired_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.gate_movements
       SET status = 'EXPIRED'
     WHERE college_id = p_college_id
       AND status = 'PENDING_REASON'
       AND scanned_at <= now() - interval '5 minutes'
     RETURNING id, college_id
  )
  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  SELECT id, college_id, 'expired', NULL, 'system', '{}'::jsonb FROM expired;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.gate_regenerate_student_qr(
  p_college_id text,
  p_student_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  next_version integer;
  inserted_token public.student_qr_tokens%ROWTYPE;
BEGIN
  IF p_actor_role <> 'admin' THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_college_id || ':' || p_student_id::text, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.students
     WHERE id = p_student_id
       AND college_id = p_college_id
  ) THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(MAX(qr_version), 0) + 1
    INTO next_version
    FROM public.student_qr_tokens
   WHERE college_id = p_college_id
     AND student_id = p_student_id;

  UPDATE public.student_qr_tokens
     SET is_active = false,
         revoked_at = now(),
         revoked_by = p_actor_id
   WHERE college_id = p_college_id
     AND student_id = p_student_id
     AND is_active;

  INSERT INTO public.student_qr_tokens
    (college_id, student_id, token, qr_version, is_active)
  VALUES
    (p_college_id, p_student_id, p_token, next_version, true)
  RETURNING * INTO inserted_token;

  INSERT INTO public.gate_movement_events
    (movement_id, college_id, event_type, actor_id, actor_role, metadata)
  VALUES (
    NULL,
    p_college_id,
    'qr_regenerated',
    p_actor_id,
    p_actor_role,
    jsonb_build_object('studentId', p_student_id, 'qrVersion', next_version)
  );

  RETURN jsonb_build_object('token', to_jsonb(inserted_token));
END;
$$;

REVOKE ALL ON FUNCTION public.gate_scan_movement(text, uuid, uuid, uuid, text, text, text, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gate_transition_movement(text, uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gate_expire_pending_reason(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gate_regenerate_student_qr(text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.gate_scan_movement(text, uuid, uuid, uuid, text, text, text, text, text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.gate_transition_movement(text, uuid, uuid, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gate_expire_pending_reason(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.gate_regenerate_student_qr(text, uuid, uuid, text, text) TO service_role;

COMMIT;
