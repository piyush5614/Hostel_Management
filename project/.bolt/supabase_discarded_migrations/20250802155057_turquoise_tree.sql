/*
  # Fix students table policy conflict

  1. Policy Updates
    - Safely drop existing "Students can read own data" policy if it exists
    - Recreate policy with correct rule: auth.uid() = user_id
    - Ensure proper access control for students to read their own data

  2. Security
    - Maintains RLS protection
    - Uses proper auth.uid() matching against user_id column
*/

-- Safely drop the existing policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'Students can read own data'
  ) THEN
    DROP POLICY "Students can read own data" ON students;
  END IF;
END $$;

-- Recreate the policy with the correct rule
CREATE POLICY "Students can read own data"
  ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);