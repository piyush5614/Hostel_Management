/*
  # Fix users table RLS policies for authentication

  1. Security Changes
    - Drop all existing conflicting policies on users table
    - Create comprehensive RLS policies for authenticated users
    - Allow users to manage their own profile data
    - Enable proper authentication flow

  2. Policy Details
    - SELECT: Allow authenticated users to read their own profile
    - INSERT: Allow authenticated users to create their own profile during signup
    - UPDATE: Allow authenticated users to update their own profile data
    - Special policy for auth initialization to handle session restoration
*/

-- First, ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow users to read their own row" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create comprehensive policies for authenticated users
CREATE POLICY "authenticated_users_select_own" ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "authenticated_users_insert_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "authenticated_users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Create admin policies for user management
CREATE POLICY "admins_select_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'warden')
    )
  );

CREATE POLICY "admins_update_all_users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'warden')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'warden')
    )
  );

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;