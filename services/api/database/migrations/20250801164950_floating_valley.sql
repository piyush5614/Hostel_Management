/*
  # Fix RLS policies for users table

  1. Security Updates
    - Add policy for authenticated users to insert their own profile during registration
    - Add policy for authenticated users to read their own profile data
    - Add policy for authenticated users to update their own profile (like last_login)
    - Ensure policies work with auth.uid() for proper user identification

  2. Changes Made
    - Drop existing conflicting policies that might be too restrictive
    - Add comprehensive policies for SELECT, INSERT, and UPDATE operations
    - Ensure users can manage their own data after authentication
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Allow users to read their own row" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Also allow public read access for users to read their own row (for unauthenticated state transitions)
CREATE POLICY "Allow users to read their own row"
  ON users
  FOR SELECT
  TO public
  USING (auth_id = auth.uid());