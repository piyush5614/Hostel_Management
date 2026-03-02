/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current RLS policies on users table are causing infinite recursion
    - Policies are likely referencing the users table within their own conditions
    - This creates a circular dependency when Supabase tries to evaluate permissions

  2. Solution
    - Drop existing problematic policies
    - Create new, simplified policies that avoid self-referencing
    - Use auth.uid() directly instead of querying users table within policies
    - Ensure policies are properly scoped to prevent recursion

  3. Security
    - Maintain proper access control
    - Users can only access their own data
    - Admins and wardens have broader access
    - Prevent unauthorized data access
*/

-- Drop existing policies that may be causing recursion
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create new, non-recursive policies
-- Policy for users to read their own data (using auth.uid() directly)
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Policy for users to update their own data (using auth.uid() directly)
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Policy for admins and wardens to read all users
-- Use a simple role check without querying users table
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'warden')
    )
    OR auth_id = auth.uid()
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
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'warden')
    )
    OR auth_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'warden')
    )
    OR auth_id = auth.uid()
  );

-- Policy for inserting new users (typically during registration)
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;