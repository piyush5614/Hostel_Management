-- Staff & Task Management System Migration
-- Generated: 2026-02-20

-- ================================
-- Enhanced staff_profiles table
-- ================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  employee_id TEXT NOT NULL UNIQUE,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  shift_timing TEXT NOT NULL DEFAULT '08:00-16:00',
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_image TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  emergency_contact TEXT,
  qualifications TEXT,
  medical_notes TEXT,
  on_duty BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  generated_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- staff_tasks table
-- ================================
CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_to UUID NOT NULL REFERENCES staff_profiles(id),
  assigned_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('maintenance', 'cleaning', 'security', 'administrative', 'other')),
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  notes TEXT,
  attachments TEXT[],
  photo_submission_status TEXT CHECK (photo_submission_status IN ('pending', 'approved', 'rejected')),
  photo_approved_by UUID,
  photo_approved_at TIMESTAMPTZ,
  work_in_progress_photos TEXT[],
  reassigned_from UUID,
  reassigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- task_comments table
-- ================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES staff_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- task_progress table
-- ================================
CREATE TABLE IF NOT EXISTS task_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES staff_tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id),
  status TEXT NOT NULL CHECK (status IN ('started', 'update', 'completed')),
  notes TEXT NOT NULL,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- generated_credentials table
-- ================================
CREATE TABLE IF NOT EXISTS generated_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'warden', 'staff', 'student')),
  generated_id TEXT NOT NULL UNIQUE,
  generated_password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  password_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- activity_logs table
-- ================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('staff', 'student', 'task', 'credential', 'room')),
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- Add profile_image to students if not exists
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE students ADD COLUMN profile_image TEXT;
  END IF;
END $$;

-- ================================
-- Indexes for efficient searching and filtering
-- ================================
CREATE INDEX IF NOT EXISTS idx_staff_profiles_department ON staff_profiles(department);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_position ON staff_profiles(position);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_is_active ON staff_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_shift_timing ON staff_profiles(shift_timing);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employee_id ON staff_profiles(employee_id);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_category ON staff_tasks(category);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);

CREATE INDEX IF NOT EXISTS idx_generated_credentials_role ON generated_credentials(role);
CREATE INDEX IF NOT EXISTS idx_generated_credentials_generated_id ON generated_credentials(generated_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ================================
-- Row Level Security Policies
-- ================================

-- Enable RLS on all new tables
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Staff Profiles: Admin/Warden can read all, staff can read own
CREATE POLICY "admin_warden_read_staff" ON staff_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role IN ('admin', 'warden')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "admin_manage_staff" ON staff_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "warden_update_staff" ON staff_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role = 'warden'
    )
  );

-- Staff Tasks: Admin/Warden can manage all, staff can read/update own
CREATE POLICY "admin_warden_manage_tasks" ON staff_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role IN ('admin', 'warden')
    )
  );

CREATE POLICY "staff_read_own_tasks" ON staff_tasks
  FOR SELECT USING (
    assigned_to IN (
      SELECT id FROM staff_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "staff_update_own_tasks" ON staff_tasks
  FOR UPDATE USING (
    assigned_to IN (
      SELECT id FROM staff_profiles WHERE user_id = auth.uid()
    )
  );

-- Task Comments: All authenticated users can read, any can create
CREATE POLICY "read_task_comments" ON task_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "create_task_comments" ON task_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Task Progress: Staff can manage own, admin/warden can read all
CREATE POLICY "staff_manage_own_progress" ON task_progress
  FOR ALL USING (
    staff_id IN (
      SELECT id FROM staff_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_warden_read_progress" ON task_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role IN ('admin', 'warden')
    )
  );

-- Credentials: Admin only
CREATE POLICY "admin_manage_credentials" ON generated_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Activity Logs: Admin can read all
CREATE POLICY "admin_read_activity_logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "system_insert_activity_logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ================================
-- Updated_at trigger function
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_tasks_updated_at
  BEFORE UPDATE ON staff_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
