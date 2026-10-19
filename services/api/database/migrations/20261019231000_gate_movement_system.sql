BEGIN;

ALTER TABLE public.users
  ADD CONSTRAINT users_college_id_id_gate_movement_key UNIQUE (college_id, id);

ALTER TABLE public.students
  ADD CONSTRAINT students_college_id_id_gate_movement_key UNIQUE (college_id, id);

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS block text;

CREATE TABLE public.student_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL,
  token text NOT NULL UNIQUE
    CHECK (token ~ '^TCHC1\.[A-Za-z0-9_-]{43}$'),
  qr_version integer NOT NULL DEFAULT 1 CHECK (qr_version > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  CONSTRAINT student_qr_tokens_student_college_fk
    FOREIGN KEY (college_id, student_id)
    REFERENCES public.students(college_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT student_qr_tokens_revoked_by_college_fk
    FOREIGN KEY (college_id, revoked_by)
    REFERENCES public.users(college_id, id)
    ON DELETE SET NULL (revoked_by),
  CONSTRAINT student_qr_tokens_revocation_state_check
    CHECK ((is_active AND revoked_at IS NULL) OR (NOT is_active AND revoked_at IS NOT NULL)),
  CONSTRAINT student_qr_tokens_student_version_key
    UNIQUE (college_id, student_id, qr_version)
);

CREATE UNIQUE INDEX student_qr_tokens_one_active_per_student
  ON public.student_qr_tokens (college_id, student_id)
  WHERE is_active;

CREATE TABLE public.gate_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL,
  status text NOT NULL
    CHECK (status IN (
      'PENDING_REASON',
      'PENDING_APPROVAL',
      'OUT',
      'RETURNED',
      'EXPIRED',
      'REJECTED',
      'CANCELLED'
    )),
  reason text,
  reason_category text
    CHECK (reason_category IS NULL OR reason_category IN (
      'college',
      'shop/market',
      'meet friends',
      'medical',
      'other'
    )),
  scanned_by uuid NOT NULL,
  scanned_by_role text NOT NULL CHECK (scanned_by_role IN ('staff', 'warden', 'admin')),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  reason_submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejection_note text,
  out_time timestamptz,
  in_time timestamptz,
  return_scanned_by uuid,
  is_late_return boolean NOT NULL DEFAULT false,
  student_name text NOT NULL,
  enrollment_no text,
  room_number text,
  hostel_block text,
  mobile_number text,
  course_year text,
  out_date_ist date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gate_movements_student_college_fk
    FOREIGN KEY (college_id, student_id)
    REFERENCES public.students(college_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT gate_movements_scanned_by_college_fk
    FOREIGN KEY (college_id, scanned_by)
    REFERENCES public.users(college_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT gate_movements_approved_by_college_fk
    FOREIGN KEY (college_id, approved_by)
    REFERENCES public.users(college_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT gate_movements_return_scanned_by_college_fk
    FOREIGN KEY (college_id, return_scanned_by)
    REFERENCES public.users(college_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT gate_movements_id_college_key UNIQUE (id, college_id),
  CONSTRAINT gate_movements_in_time_after_out_time_check
    CHECK (in_time IS NULL OR (out_time IS NOT NULL AND in_time >= out_time)),
  CONSTRAINT gate_movements_out_time_matches_status_check
    CHECK ((status IN ('OUT', 'RETURNED')) = (out_time IS NOT NULL)),
  CONSTRAINT gate_movements_in_time_matches_status_check
    CHECK ((status = 'RETURNED') = (in_time IS NOT NULL)),
  CONSTRAINT gate_movements_approved_state_check
    CHECK (
      status NOT IN ('OUT', 'RETURNED')
      OR (
        approved_by IS NOT NULL
        AND approved_at IS NOT NULL
        AND reason IS NOT NULL
        AND reason_submitted_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX gate_movements_one_open_per_student
  ON public.gate_movements (college_id, student_id)
  WHERE status IN ('PENDING_REASON', 'PENDING_APPROVAL', 'OUT');

CREATE INDEX gate_movements_college_out_date_ist_idx
  ON public.gate_movements (college_id, out_date_ist);

CREATE INDEX gate_movements_college_student_out_time_idx
  ON public.gate_movements (college_id, student_id, out_time DESC);

CREATE INDEX gate_movements_college_status_idx
  ON public.gate_movements (college_id, status);

CREATE TABLE public.gate_movement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid,
  college_id text NOT NULL REFERENCES public.colleges(id),
  event_type text NOT NULL
    CHECK (event_type IN (
      'scanned',
      'reason_submitted',
      'approved',
      'rejected',
      'expired',
      'returned',
      'cancelled',
      'qr_regenerated'
    )),
  actor_id uuid,
  actor_role text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gate_movement_events_movement_college_fk
    FOREIGN KEY (movement_id, college_id)
    REFERENCES public.gate_movements(id, college_id)
    ON DELETE RESTRICT,
  CONSTRAINT gate_movement_events_actor_college_fk
    FOREIGN KEY (college_id, actor_id)
    REFERENCES public.users(college_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX gate_movement_events_movement_created_idx
  ON public.gate_movement_events (college_id, movement_id, created_at);

CREATE OR REPLACE FUNCTION public.set_gate_record_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_qr_tokens_updated_at
  BEFORE UPDATE ON public.student_qr_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_gate_record_updated_at();

CREATE TRIGGER gate_movements_updated_at
  BEFORE UPDATE ON public.gate_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_gate_record_updated_at();

CREATE OR REPLACE FUNCTION public.set_gate_movement_out_date_ist()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.out_date_ist := CASE
    WHEN NEW.out_time IS NULL THEN NULL
    ELSE (NEW.out_time AT TIME ZONE 'Asia/Kolkata')::date
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER gate_movements_out_date_ist
  BEFORE INSERT OR UPDATE OF out_time ON public.gate_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_gate_movement_out_date_ist();

CREATE OR REPLACE FUNCTION public.prevent_gate_movement_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'gate_movement_events is append-only';
END;
$$;

CREATE TRIGGER gate_movement_events_append_only
  BEFORE UPDATE OR DELETE ON public.gate_movement_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gate_movement_event_mutation();

ALTER TABLE public.student_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_movement_events ENABLE ROW LEVEL SECURITY;

COMMIT;
