BEGIN;

DROP FUNCTION IF EXISTS public.gate_regenerate_student_qr(text, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.gate_expire_pending_reason(text);
DROP FUNCTION IF EXISTS public.gate_transition_movement(text, uuid, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.gate_scan_movement(text, uuid, uuid, uuid, text, text, text, text, text, text, text, boolean);

DROP TABLE IF EXISTS public.gate_movement_events;
DROP TABLE IF EXISTS public.gate_movements;
DROP TABLE IF EXISTS public.student_qr_tokens;

DROP FUNCTION IF EXISTS public.prevent_gate_movement_event_mutation();
DROP FUNCTION IF EXISTS public.set_gate_movement_out_date_ist();
DROP FUNCTION IF EXISTS public.set_gate_record_updated_at();

ALTER TABLE public.rooms
  DROP COLUMN IF EXISTS block;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_college_id_id_gate_movement_key;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_college_id_id_gate_movement_key;

COMMIT;
