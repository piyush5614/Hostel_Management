CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.colleges (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  auth_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  generated_id text,
  profile_image text,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, email)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_generated_id_per_college
  ON public.users (college_id, generated_id)
  WHERE generated_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  number text NOT NULL,
  floor integer NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 3,
  type text NOT NULL DEFAULT 'Non-AC',
  gender text NOT NULL DEFAULT 'any',
  status text NOT NULL DEFAULT 'available',
  occupied_beds integer NOT NULL DEFAULT 0,
  total_beds integer NOT NULL DEFAULT 3,
  last_cleaned timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, number)
);

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enrollment_number text,
  course text,
  year integer,
  gender text,
  date_of_birth date,
  contact_number text,
  address text,
  guardian_name text,
  guardian_contact text,
  emergency_contact text,
  medical_notes text,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  bed_id uuid,
  profile_image text,
  parent_image_1 text,
  parent_image_2 text,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  current_status text NOT NULL DEFAULT 'present',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS students_enrollment_per_college
  ON public.students (college_id, enrollment_number)
  WHERE enrollment_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  position text,
  contact_number text,
  address text,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_timing text,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, employee_id),
  UNIQUE (college_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  number integer NOT NULL,
  status text NOT NULL DEFAULT 'available',
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  assigned_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_bed_id_fkey'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.room_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  amenity text NOT NULL,
  UNIQUE (room_id, amenity)
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  morning_status text NOT NULL,
  evening_status text NOT NULL,
  remarks text,
  recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, student_id, date)
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text NOT NULL DEFAULT 'present',
  shift_duration integer,
  remarks text,
  recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, staff_id, date)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approver_comments text,
  documents text[],
  emergency_contact text,
  check_out_time timestamptz,
  check_in_time timestamptz,
  actual_return_date timestamptz,
  parent_call_verified boolean NOT NULL DEFAULT false,
  parent_call_timestamp timestamptz,
  parent_call_notes text,
  parent_call_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  parent_approval_status text
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requester_type text NOT NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  category text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  estimated_cost numeric,
  actual_cost numeric,
  remarks text,
  images text[]
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  subject text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  attachments text[],
  message_type text NOT NULL DEFAULT 'direct',
  priority text NOT NULL DEFAULT 'normal'
);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'complaint',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolution text,
  attachments text[],
  category text NOT NULL DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  comments text,
  documents text[],
  urgency text NOT NULL DEFAULT 'medium',
  expected_completion_date date
);

CREATE TABLE IF NOT EXISTS public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  name text NOT NULL,
  contact_number text,
  purpose text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  check_in_time timestamptz NOT NULL DEFAULT now(),
  check_out_time timestamptz,
  id_proof_type text,
  id_proof_number text,
  vehicle_number text,
  photo text,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  visit_duration integer,
  remarks text
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  notifications jsonb NOT NULL DEFAULT '{"email":true,"push":true,"sms":false}'::jsonb,
  privacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  display jsonb NOT NULL DEFAULT '{}'::jsonb,
  security jsonb NOT NULL DEFAULT '{}'::jsonb,
  communication jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  assigned_to uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  category text NOT NULL DEFAULT 'other',
  estimated_hours numeric,
  actual_hours numeric,
  notes text,
  attachments text[],
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  students jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_to_admin boolean NOT NULL DEFAULT false,
  admin_reviewed boolean NOT NULL DEFAULT false,
  review_comments text
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id text NOT NULL REFERENCES public.colleges(id),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_college_role_idx ON public.users (college_id, role);
CREATE INDEX IF NOT EXISTS students_college_status_idx ON public.students (college_id, current_status);
CREATE INDEX IF NOT EXISTS staff_college_active_idx ON public.staff (college_id, is_active);
CREATE INDEX IF NOT EXISTS rooms_college_floor_number_idx ON public.rooms (college_id, floor, number);
CREATE INDEX IF NOT EXISTS beds_college_room_idx ON public.beds (college_id, room_id);
CREATE INDEX IF NOT EXISTS attendance_college_date_idx ON public.attendance (college_id, date);
CREATE INDEX IF NOT EXISTS leave_requests_college_status_idx ON public.leave_requests (college_id, status);
CREATE INDEX IF NOT EXISTS applications_college_status_idx ON public.applications (college_id, status);
CREATE INDEX IF NOT EXISTS maintenance_requests_college_status_idx ON public.maintenance_requests (college_id, status);
CREATE INDEX IF NOT EXISTS messages_college_sender_idx ON public.messages (college_id, sender_id);
CREATE INDEX IF NOT EXISTS messages_college_receiver_idx ON public.messages (college_id, receiver_id);
CREATE INDEX IF NOT EXISTS visitors_college_checkin_idx ON public.visitors (college_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS reports_college_status_idx ON public.reports (college_id, status);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'colleges', 'users', 'rooms', 'students', 'staff', 'beds', 'room_amenities',
    'attendance', 'staff_attendance', 'leave_requests', 'maintenance_requests',
    'messages', 'reports', 'applications', 'visitors', 'events',
    'event_registrations', 'user_settings', 'staff_shifts', 'staff_tasks',
    'daily_reports', 'attendance_sheets', 'notifications', 'activity_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

INSERT INTO public.colleges (id, name)
VALUES ('college-default', 'Default College')
ON CONFLICT (id) DO NOTHING;
