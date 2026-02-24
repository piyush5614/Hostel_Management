/*
  # Create Hostel Management System Schema

  1. New Tables
    - `users` - System users (admin, warden, staff, students)
    - `students` - Student profiles and academic information
    - `staff` - Staff member profiles and employment details
    - `rooms` - Hostel room information
    - `beds` - Individual bed assignments within rooms
    - `attendance` - Daily attendance records
    - `leave_requests` - Student leave applications
    - `maintenance_requests` - Maintenance and repair requests
    - `visitors` - Visitor log and management
    - `messages` - Internal messaging system
    - `reports` - Student reports and complaints
    - `applications` - General student applications
    - `events` - Event management and announcements
    - `event_registrations` - Event participation tracking
    - `staff_shifts` - Staff shift scheduling
    - `staff_tasks` - Task assignments for staff
    - `daily_reports` - Staff daily activity reports
    - `attendance_sheets` - Batch attendance submissions
    - `user_settings` - User preferences and configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (main authentication and profile)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'warden', 'staff', 'student')),
  profile_image text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  enrollment_number text UNIQUE NOT NULL,
  course text NOT NULL,
  year integer NOT NULL CHECK (year >= 1 AND year <= 4),
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth date NOT NULL,
  contact_number text NOT NULL,
  address text NOT NULL,
  guardian_name text NOT NULL,
  guardian_contact text NOT NULL,
  emergency_contact text NOT NULL,
  medical_notes text,
  room_id uuid,
  bed_id uuid,
  joining_date date DEFAULT CURRENT_DATE,
  current_status text DEFAULT 'present' CHECK (current_status IN ('present', 'on-leave', 'absent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL,
  position text NOT NULL,
  contact_number text NOT NULL,
  address text NOT NULL,
  joining_date date NOT NULL,
  shift_timing text NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  number text UNIQUE NOT NULL,
  floor integer NOT NULL,
  capacity integer DEFAULT 3,
  type text NOT NULL CHECK (type IN ('AC', 'Non-AC')),
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'any')),
  status text DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance')),
  occupied_beds integer DEFAULT 0,
  total_beds integer DEFAULT 3,
  amenities text[] DEFAULT ARRAY['WiFi', 'Study Table', 'Wardrobe', 'Fan'],
  last_cleaned timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Beds table
CREATE TABLE IF NOT EXISTS beds (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  number integer NOT NULL,
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  assigned_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, number)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  morning_status text NOT NULL CHECK (morning_status IN ('present', 'absent', 'leave')),
  evening_status text NOT NULL CHECK (evening_status IN ('present', 'absent', 'leave')),
  remarks text,
  recorded_by uuid REFERENCES users(id),
  recorded_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('home-leave', 'medical-leave', 'emergency-leave', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  approver_comments text,
  documents text[],
  emergency_contact text,
  check_out_time timestamptz,
  check_in_time timestamptz,
  actual_return_date timestamptz
);

-- Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid REFERENCES users(id) ON DELETE CASCADE,
  requester_type text NOT NULL CHECK (requester_type IN ('student', 'staff')),
  room_id uuid REFERENCES rooms(id),
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'rejected')),
  category text NOT NULL CHECK (category IN ('electrical', 'plumbing', 'furniture', 'cleaning', 'ac', 'other')),
  created_at timestamptz DEFAULT now(),
  assigned_to uuid REFERENCES users(id),
  completed_at timestamptz,
  estimated_cost decimal,
  actual_cost decimal,
  remarks text,
  images text[]
);

-- Visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_number text NOT NULL,
  purpose text NOT NULL,
  student_id uuid REFERENCES students(id),
  staff_id uuid REFERENCES staff(id),
  check_in_time timestamptz DEFAULT now(),
  check_out_time timestamptz,
  id_proof_type text NOT NULL,
  id_proof_number text NOT NULL,
  vehicle_number text,
  approved_by uuid REFERENCES users(id),
  visit_duration integer,
  remarks text
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  subject text,
  timestamp timestamptz DEFAULT now(),
  read boolean DEFAULT false,
  message_type text DEFAULT 'direct' CHECK (message_type IN ('direct', 'announcement', 'system')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  attachments text[]
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('maintenance', 'complaint', 'suggestion', 'emergency')),
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  assigned_to uuid REFERENCES users(id),
  resolution text,
  attachments text[]
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('leave', 'room-change', 'course-change', 'document-request', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under-review')),
  urgency text DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  comments text,
  documents text[],
  expected_completion_date date
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  location text NOT NULL,
  category text NOT NULL CHECK (category IN ('academic', 'cultural', 'sports', 'social', 'official')),
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'students-only', 'staff-only', 'private')),
  organizer text NOT NULL,
  created_by uuid REFERENCES users(id),
  max_participants integer,
  registration_required boolean DEFAULT false,
  registration_deadline timestamptz,
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  registered_at timestamptz DEFAULT now(),
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  UNIQUE(event_id, student_id)
);

-- Staff shifts table
CREATE TABLE IF NOT EXISTS staff_shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration integer NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'missed')),
  check_in_time timestamptz,
  check_out_time timestamptz,
  actual_duration integer,
  location text NOT NULL,
  responsibilities text[],
  notes text
);

-- Staff tasks table
CREATE TABLE IF NOT EXISTS staff_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assigned_to uuid REFERENCES staff(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES users(id),
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  category text NOT NULL CHECK (category IN ('maintenance', 'cleaning', 'security', 'administrative', 'other')),
  estimated_hours integer,
  actual_hours integer,
  notes text,
  attachments text[]
);

-- Daily reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  tasks_completed text[],
  incidents_reported text[],
  maintenance_issues text[],
  student_interactions integer DEFAULT 0,
  visitor_count integer DEFAULT 0,
  notes text,
  submitted_at timestamptz DEFAULT now(),
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  reviewed_by uuid REFERENCES users(id),
  review_comments text,
  UNIQUE(staff_id, date)
);

-- Attendance sheets table
CREATE TABLE IF NOT EXISTS attendance_sheets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  room_id uuid REFERENCES rooms(id),
  floor integer,
  recorded_by uuid REFERENCES users(id),
  students jsonb NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  submitted_to_admin boolean DEFAULT false,
  admin_reviewed boolean DEFAULT false,
  review_comments text
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  notifications jsonb DEFAULT '{"email": true, "push": true, "sms": false, "announcements": true, "events": true, "maintenance": true, "fees": true}',
  privacy jsonb DEFAULT '{"profileVisibility": "students-only", "showContactInfo": true, "showAcademicInfo": true}',
  display jsonb DEFAULT '{"theme": "light", "language": "en", "dateFormat": "DD/MM/YYYY", "timeFormat": "12h"}',
  security jsonb DEFAULT '{"twoFactorEnabled": false, "loginNotifications": true, "sessionTimeout": 30}',
  communication jsonb DEFAULT '{"allowMessages": true, "allowGroupMessages": true, "autoReply": false, "autoReplyMessage": ""}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Admin can read all users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);
CREATE POLICY "Admin can update all users" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);

-- Create policies for students table
CREATE POLICY "Students can read own data" ON students FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Students can update own data" ON students FOR UPDATE USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Staff can read all students" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden', 'staff'))
);
CREATE POLICY "Admin can manage students" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);

-- Create policies for rooms and beds
CREATE POLICY "All authenticated users can read rooms" ON rooms FOR SELECT TO authenticated;
CREATE POLICY "Admin can manage rooms" ON rooms FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);
CREATE POLICY "All authenticated users can read beds" ON beds FOR SELECT TO authenticated;
CREATE POLICY "Admin can manage beds" ON beds FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);

-- Create policies for attendance
CREATE POLICY "Students can read own attendance" ON attendance FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);
CREATE POLICY "Staff can manage attendance" ON attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden', 'staff'))
);

-- Create policies for leave requests
CREATE POLICY "Students can manage own leave requests" ON leave_requests FOR ALL USING (
  student_id IN (SELECT id FROM students WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
);
CREATE POLICY "Staff can read all leave requests" ON leave_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden', 'staff'))
);
CREATE POLICY "Admin can manage leave requests" ON leave_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);

-- Create policies for maintenance requests
CREATE POLICY "Users can read own maintenance requests" ON maintenance_requests FOR SELECT USING (
  requester_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can create maintenance requests" ON maintenance_requests FOR INSERT WITH CHECK (
  requester_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Staff can manage maintenance requests" ON maintenance_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden', 'staff'))
);

-- Create policies for messages
CREATE POLICY "Users can read own messages" ON messages FOR SELECT USING (
  sender_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
  receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (
  receiver_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Create policies for events
CREATE POLICY "All authenticated users can read published events" ON events FOR SELECT TO authenticated;
CREATE POLICY "Admin can manage events" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('admin', 'warden'))
);

-- Create policies for user settings
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);

-- Add foreign key constraints for students
ALTER TABLE students ADD CONSTRAINT fk_students_room FOREIGN KEY (room_id) REFERENCES rooms(id);
ALTER TABLE students ADD CONSTRAINT fk_students_bed FOREIGN KEY (bed_id) REFERENCES beds(id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();