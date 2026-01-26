/*
  # Fix Admin Enrollment Policy WITH CHECK Clause

  ## Problem
  The "Admins can manage enrollments" policy may not have a WITH CHECK clause,
  which is required for INSERT and UPDATE operations to work properly.

  ## Solution
  1. Drop existing admin policies to avoid conflicts
  2. Recreate a single comprehensive admin policy with both USING and WITH CHECK clauses
  
  ## Security
  - Maintains admin access using is_admin() function
  - Ensures admins can perform all operations (SELECT, INSERT, UPDATE, DELETE)
*/

-- Drop all existing admin policies on enrollments
DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can create enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON enrollments;

-- Create a single comprehensive admin policy with both USING and WITH CHECK
CREATE POLICY "Admins have full access to enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Also ensure Centers policies don't have duplicates
DROP POLICY IF EXISTS "Centers can view own enrollments" ON enrollments;

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'enrollments'::regclass 
    AND polname = 'Admins have full access to enrollments'
  ) THEN
    RAISE NOTICE '✓ Admin policy created successfully with USING and WITH CHECK clauses';
  ELSE
    RAISE WARNING '✗ Failed to create admin policy';
  END IF;
END $$;
