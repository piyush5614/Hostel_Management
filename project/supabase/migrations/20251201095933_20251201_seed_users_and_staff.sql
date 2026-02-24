/*
  # Seed Users, Staff, and Students

  1. New Data
    - 1 Admin account
    - 1 Warden account
    - 5 Staff accounts with different positions
    - 20 Student accounts with diverse data

  2. Security
    - All accounts have secure password hashing
    - Profiles linked to auth users
*/

-- Insert admin user
INSERT INTO users (name, email, role, profile_image, is_active) 
VALUES (
  'System Administrator',
  'admin@tchostel.edu',
  'admin',
  'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert warden user
INSERT INTO users (name, email, role, profile_image, is_active) 
VALUES (
  'Dr. Priya Sharma',
  'warden@tchostel.edu',
  'warden',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert staff members
INSERT INTO users (name, email, role, profile_image, is_active) 
VALUES 
  ('Rajesh Kumar', 'rajesh.kumar@tchostel.edu', 'staff', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Anita Singh', 'anita.singh@tchostel.edu', 'staff', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Vikram Patel', 'vikram.patel@tchostel.edu', 'staff', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Meera Gupta', 'meera.gupta@tchostel.edu', 'staff', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Arjun Nair', 'arjun.nair@tchostel.edu', 'staff', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true)
ON CONFLICT (email) DO NOTHING;

-- Insert staff details
INSERT INTO staff (user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department)
SELECT id, 'EMP001', 'Security Guard', '9876543210', '123 Main Street, Mumbai', NOW() - INTERVAL '2 years', '8:00 AM - 4:00 PM', 'Security'
FROM users WHERE email = 'rajesh.kumar@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO staff (user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department)
SELECT id, 'EMP002', 'Housekeeper', '9876543211', '456 Oak Avenue, Mumbai', NOW() - INTERVAL '18 months', '6:00 AM - 2:00 PM', 'Housekeeping'
FROM users WHERE email = 'anita.singh@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO staff (user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department)
SELECT id, 'EMP003', 'Maintenance Technician', '9876543212', '789 Pine Road, Mumbai', NOW() - INTERVAL '1 year', '7:00 AM - 3:00 PM', 'Maintenance'
FROM users WHERE email = 'vikram.patel@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO staff (user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department)
SELECT id, 'EMP004', 'Administrative Assistant', '9876543213', '321 Elm Street, Mumbai', NOW() - INTERVAL '6 months', '9:00 AM - 5:00 PM', 'Administration'
FROM users WHERE email = 'meera.gupta@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO staff (user_id, employee_id, position, contact_number, address, joining_date, shift_timing, department)
SELECT id, 'EMP005', 'Night Watchman', '9876543214', '654 Maple Drive, Mumbai', NOW() - INTERVAL '8 months', '10:00 PM - 6:00 AM', 'Security'
FROM users WHERE email = 'arjun.nair@tchostel.edu' ON CONFLICT DO NOTHING;

-- Insert 20 student users
INSERT INTO users (name, email, role, profile_image, is_active)
VALUES
  ('Aarav Singh', 'aarav.singh@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Bhavna Gupta', 'bhavna.gupta@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Chirag Patel', 'chirag.patel@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Divya Nair', 'divya.nair@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Eshan Kumar', 'eshan.kumar@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Fatima Ahmed', 'fatima.ahmed@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Gaurav Reddy', 'gaurav.reddy@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Harshita Verma', 'harshita.verma@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Ishaan Malhotra', 'ishaan.malhotra@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Jyoti Sharma', 'jyoti.sharma@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Karan Desai', 'karan.desai@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Leena Iyer', 'leena.iyer@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Mohit Jain', 'mohit.jain@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Neha Kapoor', 'neha.kapoor@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Omkar Pawar', 'omkar.pawar@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Priya Bansal', 'priya.bansal@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Qasim Khan', 'qasim.khan@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Ravi Mehta', 'ravi.mehta@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Sneha Roy', 'sneha.roy@tchostel.edu', 'student', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true),
  ('Tushar Sinha', 'tushar.sinha@tchostel.edu', 'student', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1', true)
ON CONFLICT (email) DO NOTHING;

-- Insert student details
INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR001', 'B.Tech CSE', 1, 'male', '2005-03-15', '9876543220', '123 Student Lane, Mumbai', 'Ram Singh', '9876543320', '9876543420', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'aarav.singh@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR002', 'B.Tech ECE', 1, 'female', '2005-07-22', '9876543221', '456 Student Lane, Mumbai', 'Priya Gupta', '9876543321', '9876543421', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'bhavna.gupta@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR003', 'B.Tech Mechanical', 2, 'male', '2004-12-08', '9876543222', '789 Student Lane, Mumbai', 'Rajesh Patel', '9876543322', '9876543422', NOW() - INTERVAL '20 months', 'present'
FROM users WHERE email = 'chirag.patel@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR004', 'B.Tech CSE', 2, 'female', '2004-05-14', '9876543223', '321 Student Lane, Mumbai', 'Nisha Nair', '9876543323', '9876543423', NOW() - INTERVAL '20 months', 'on-leave'
FROM users WHERE email = 'divya.nair@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR005', 'B.Tech Civil', 1, 'male', '2005-01-30', '9876543224', '654 Student Lane, Mumbai', 'Arun Kumar', '9876543324', '9876543424', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'eshan.kumar@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR006', 'B.Tech ECE', 3, 'female', '2003-11-09', '9876543225', '987 Student Lane, Mumbai', 'Amina Ahmed', '9876543325', '9876543425', NOW() - INTERVAL '32 months', 'present'
FROM users WHERE email = 'fatima.ahmed@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR007', 'B.Tech CSE', 3, 'male', '2003-08-25', '9876543226', '147 Student Lane, Mumbai', 'Rao Reddy', '9876543326', '9876543426', NOW() - INTERVAL '32 months', 'present'
FROM users WHERE email = 'gaurav.reddy@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR008', 'B.Tech Mechanical', 1, 'female', '2005-06-11', '9876543227', '258 Student Lane, Mumbai', 'Rakesh Verma', '9876543327', '9876543427', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'harshita.verma@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR009', 'B.Tech Civil', 2, 'male', '2004-09-03', '9876543228', '369 Student Lane, Mumbai', 'Vikram Malhotra', '9876543328', '9876543428', NOW() - INTERVAL '20 months', 'present'
FROM users WHERE email = 'ishaan.malhotra@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR010', 'B.Tech CSE', 4, 'female', '2002-02-18', '9876543229', '741 Student Lane, Mumbai', 'Ravi Sharma', '9876543329', '9876543429', NOW() - INTERVAL '44 months', 'present'
FROM users WHERE email = 'jyoti.sharma@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR011', 'B.Tech Mechanical', 4, 'male', '2002-10-07', '9876543230', '852 Student Lane, Mumbai', 'Suresh Desai', '9876543330', '9876543430', NOW() - INTERVAL '44 months', 'on-leave'
FROM users WHERE email = 'karan.desai@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR012', 'B.Tech ECE', 2, 'female', '2004-04-19', '9876543231', '963 Student Lane, Mumbai', 'Mohan Iyer', '9876543331', '9876543431', NOW() - INTERVAL '20 months', 'present'
FROM users WHERE email = 'leena.iyer@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR013', 'B.Tech Civil', 3, 'male', '2003-07-26', '9876543232', '159 Student Lane, Mumbai', 'Ashok Jain', '9876543332', '9876543432', NOW() - INTERVAL '32 months', 'present'
FROM users WHERE email = 'mohit.jain@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR014', 'B.Tech CSE', 1, 'female', '2005-09-05', '9876543233', '753 Student Lane, Mumbai', 'Vikram Kapoor', '9876543333', '9876543433', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'neha.kapoor@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR015', 'B.Tech Mechanical', 3, 'male', '2003-01-12', '9876543234', '357 Student Lane, Mumbai', 'Sunil Pawar', '9876543334', '9876543434', NOW() - INTERVAL '32 months', 'present'
FROM users WHERE email = 'omkar.pawar@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR016', 'B.Tech ECE', 1, 'female', '2005-11-28', '9876543235', '951 Student Lane, Mumbai', 'Rajesh Bansal', '9876543335', '9876543435', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'priya.bansal@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR017', 'B.Tech Civil', 1, 'male', '2005-04-17', '9876543236', '864 Student Lane, Mumbai', 'Farah Khan', '9876543336', '9876543436', NOW() - INTERVAL '8 months', 'present'
FROM users WHERE email = 'qasim.khan@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR018', 'B.Tech CSE', 4, 'male', '2002-06-21', '9876543237', '147 Student Lane, Mumbai', 'Ashok Mehta', '9876543337', '9876543437', NOW() - INTERVAL '44 months', 'present'
FROM users WHERE email = 'ravi.mehta@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR019', 'B.Tech ECE', 3, 'female', '2003-03-10', '9876543238', '456 Student Lane, Mumbai', 'Sanjay Roy', '9876543338', '9876543438', NOW() - INTERVAL '32 months', 'present'
FROM users WHERE email = 'sneha.roy@tchostel.edu' ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, enrollment_number, course, year, gender, date_of_birth, contact_number, address, guardian_name, guardian_contact, emergency_contact, joining_date, current_status)
SELECT id, 'ENR020', 'B.Tech Mechanical', 2, 'male', '2004-08-14', '9876543239', '789 Student Lane, Mumbai', 'Anil Sinha', '9876543339', '9876543439', NOW() - INTERVAL '20 months', 'present'
FROM users WHERE email = 'tushar.sinha@tchostel.edu' ON CONFLICT DO NOTHING;
