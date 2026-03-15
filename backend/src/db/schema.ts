import { Database } from 'sqlite';
import { DEFAULT_COLLEGE_ID } from '../utils/tenant.js';

export async function createSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'warden', 'staff', 'student')) DEFAULT 'student',
      profile_image TEXT,
      generated_id TEXT,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      UNIQUE(college_id, email),
      UNIQUE(college_id, generated_id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      user_id TEXT UNIQUE NOT NULL,
      enrollment_number TEXT NOT NULL,
      course TEXT,
      year INTEGER,
      gender TEXT,
      date_of_birth TEXT,
      contact_number TEXT,
      address TEXT,
      guardian_name TEXT,
      guardian_contact TEXT,
      emergency_contact TEXT,
      medical_notes TEXT,
      room_id TEXT,
      bed_id TEXT,
      profile_image TEXT,
      parent_image_1 TEXT,
      parent_image_2 TEXT,
      joining_date TEXT,
      current_status TEXT DEFAULT 'present',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(bed_id) REFERENCES beds(id),
      UNIQUE(college_id, enrollment_number)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      user_id TEXT UNIQUE NOT NULL,
      employee_id TEXT NOT NULL,
      position TEXT,
      contact_number TEXT,
      address TEXT,
      joining_date TEXT,
      shift_timing TEXT,
      department TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(college_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      number TEXT NOT NULL,
      floor INTEGER,
      capacity INTEGER,
      type TEXT,
      gender TEXT,
      status TEXT DEFAULT 'available',
      occupied_beds INTEGER DEFAULT 0,
      total_beds INTEGER,
      last_cleaned TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      UNIQUE(college_id, number)
    );

    CREATE TABLE IF NOT EXISTS room_amenities (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      amenity TEXT,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS beds (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      room_id TEXT NOT NULL,
      number INTEGER,
      status TEXT DEFAULT 'available',
      student_id TEXT,
      assigned_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      UNIQUE(room_id, number)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      morning_status TEXT,
      evening_status TEXT,
      remarks TEXT,
      recorded_by TEXT,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(recorded_by) REFERENCES users(id),
      UNIQUE(student_id, date)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      student_id TEXT NOT NULL,
      type TEXT,
      start_date TEXT,
      end_date TEXT,
      reason TEXT,
      emergency_contact TEXT,
      status TEXT DEFAULT 'pending',
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewed_by TEXT,
      approval_code TEXT,
      parent_approval_status TEXT DEFAULT 'pending',
      parent_call_verified INTEGER DEFAULT 0,
      parent_call_timestamp TEXT,
      parent_call_notes TEXT,
      parent_call_by TEXT,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(reviewed_by) REFERENCES users(id),
      FOREIGN KEY(parent_call_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      requester_id TEXT NOT NULL,
      requester_type TEXT,
      room_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      status TEXT DEFAULT 'pending',
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      assigned_to TEXT,
      completed_at TEXT,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(requester_id) REFERENCES users(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(assigned_to) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      name TEXT NOT NULL,
      contact_number TEXT,
      purpose TEXT,
      student_id TEXT,
      staff_id TEXT,
      check_in_time TEXT NOT NULL,
      check_out_time TEXT,
      id_proof_type TEXT,
      id_proof_number TEXT,
      vehicle_number TEXT,
      photo TEXT,
      approved_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(staff_id) REFERENCES staff(id),
      FOREIGN KEY(approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      message_type TEXT DEFAULT 'direct',
      priority TEXT DEFAULT 'normal',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      student_id TEXT NOT NULL,
      type TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      status TEXT DEFAULT 'pending',
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      assigned_to TEXT,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      student_id TEXT NOT NULL,
      type TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      urgency TEXT,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewed_by TEXT,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(reviewed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS staff_shifts (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'scheduled',
      location TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(staff_id) REFERENCES staff(id),
      UNIQUE(staff_id, date)
    );

    CREATE TABLE IF NOT EXISTS staff_tasks (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      assigned_to TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT,
      status TEXT DEFAULT 'pending',
      category TEXT,
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(assigned_to) REFERENCES staff(id),
      FOREIGN KEY(assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      id TEXT PRIMARY KEY,
      college_id TEXT NOT NULL DEFAULT '${DEFAULT_COLLEGE_ID}',
      staff_id TEXT NOT NULL,
      date TEXT NOT NULL,
      shift_start TEXT,
      shift_end TEXT,
      student_interactions INTEGER DEFAULT 0,
      visitor_count INTEGER DEFAULT 0,
      notes TEXT,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'draft',
      reviewed_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(college_id) REFERENCES colleges(id),
      FOREIGN KEY(staff_id) REFERENCES staff(id),
      FOREIGN KEY(reviewed_by) REFERENCES users(id),
      UNIQUE(staff_id, date)
    );
  `);
}

export async function ensureIndexes(db: Database): Promise<void> {
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges(code);
    CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);
    CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
    CREATE INDEX IF NOT EXISTS idx_students_college_id ON students(college_id);
    CREATE INDEX IF NOT EXISTS idx_students_room_id ON students(room_id);
    CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
    CREATE INDEX IF NOT EXISTS idx_beds_college_id ON beds(college_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_college_id ON rooms(college_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_college_id ON attendance(college_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_leave_student_id ON leave_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_leave_college_id ON leave_requests(college_id);
    CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_college_id ON maintenance_requests(college_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
    CREATE INDEX IF NOT EXISTS idx_visitors_college_id ON visitors(college_id);
    CREATE INDEX IF NOT EXISTS idx_messages_college_id ON messages(college_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_reports_college_id ON reports(college_id);
    CREATE INDEX IF NOT EXISTS idx_reports_student_id ON reports(student_id);
    CREATE INDEX IF NOT EXISTS idx_applications_college_id ON applications(college_id);
    CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
    CREATE INDEX IF NOT EXISTS idx_staff_college_id ON staff(college_id);
    CREATE INDEX IF NOT EXISTS idx_staff_shifts_college_id ON staff_shifts(college_id);
    CREATE INDEX IF NOT EXISTS idx_staff_shifts_staff_id ON staff_shifts(staff_id);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_college_id ON staff_tasks(college_id);
    CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_college_id ON daily_reports(college_id);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_staff_id ON daily_reports(staff_id);
  `);
}
