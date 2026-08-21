/*
  # Add RLS policies for users table

  1. Security
    - Enable RLS on users table (if not already enabled)
    - Add policy for users to read their own profile
    - Add policy for users to insert their own profile during registration
    - Add policy for users to update their own profile
    - Add policy for admins/wardens to read all users
    - Add policy for admins/wardens to update all users

  2. Changes
    - Creates comprehensive RLS policies to resolve permission denied errors
    - Allows authenticated users to manage their own data
    - Allows admin roles to manage all user data
*/

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Policy for users to insert their own profile during registration
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Policy for admins and wardens to read all users
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'warden')
    )
  );

-- Policy for admins and wardens to update all users
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'warden')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
           OR auth.users.raw_user_meta_data->>'role' = 'warden')
    )
  );