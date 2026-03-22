import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface TestUser {
  id: string;
  email: string;
  password: string; // raw
  role: 'student' | 'warden' | 'admin' | 'staff';
}

export interface TestStudent {
  id: string;
  user_id: string;
  roll_number: string;
  full_name: string;
}

// Create unique email for each test run
function generateTestEmail(prefix: string): string {
  return `test_${prefix}_${Date.now()}${Math.random().toString().slice(2, 6)}@hostel.local`;
}

export async function seedTestData() {
  const testUsers: Record<string, TestUser> = {};
  const testStudents: Record<string, TestStudent> = {};

  try {
    // Create test student
    const studentEmail = generateTestEmail('student');
    const studentPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(studentPassword, 10);
    const studentId = uuid();

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: studentId,
        email: studentEmail,
        password_hash: hashedPassword,
        role: 'student',
        created_at: new Date().toISOString(),
      });

    if (!userError) {
      testUsers['student'] = {
        id: studentId,
        email: studentEmail,
        password: studentPassword,
        role: 'student',
      };

      // Create associated student record
      const rollNumber = `TEST${Date.now()}${Math.random().toString().slice(2, 5)}`;
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: uuid(),
          user_id: studentId,
          roll_number: rollNumber,
          full_name: 'Test Student',
          room_id: null,
          admission_year: new Date().getFullYear(),
        });

      if (!studentError) {
        testStudents['student'] = {
          id: uuid(),
          user_id: studentId,
          roll_number: rollNumber,
          full_name: 'Test Student',
        };
      }
    }

    // Create test warden
    const wardenEmail = generateTestEmail('warden');
    const wardenPassword = 'WardenPass123!';
    const wardenHashedPassword = await bcrypt.hash(wardenPassword, 10);
    const wardenId = uuid();

    const { error: wardenUserError } = await supabase
      .from('users')
      .insert({
        id: wardenId,
        email: wardenEmail,
        password_hash: wardenHashedPassword,
        role: 'warden',
        created_at: new Date().toISOString(),
      });

    if (!wardenUserError) {
      testUsers['warden'] = {
        id: wardenId,
        email: wardenEmail,
        password: wardenPassword,
        role: 'warden',
      };
    }

    // Create test admin
    const adminEmail = generateTestEmail('admin');
    const adminPassword = 'AdminPass123!';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminId = uuid();

    const { error: adminUserError } = await supabase
      .from('users')
      .insert({
        id: adminId,
        email: adminEmail,
        password_hash: adminHashedPassword,
        role: 'admin',
        created_at: new Date().toISOString(),
      });

    if (!adminUserError) {
      testUsers['admin'] = {
        id: adminId,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      };
    }
  } catch (error) {
    console.error('Error seeding test data:', error);
  }

  return { testUsers, testStudents };
}

export async function cleanupTestData(testUsers: Record<string, TestUser>) {
  try {
    // Delete students associated with test users
    for (const user of Object.values(testUsers)) {
      await supabase.from('students').delete().eq('user_id', user.id);
    }

    // Delete test users
    for (const user of Object.values(testUsers)) {
      await supabase.from('users').delete().eq('id', user.id);
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}
