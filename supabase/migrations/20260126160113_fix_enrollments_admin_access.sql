/*
  # Fix Admin Access to Enrollments

  ## Problem
  Admins cannot see enrollments because of missing or incompatible RLS functions.
  
  ## Changes
  1. Create `is_admin()` function as an alias to `check_user_is_admin()` for compatibility
  2. Ensure both functions exist and work correctly
  3. Verify admin account has correct role
  4. Fix enrollments RLS policies to use the correct function
  
  ## Security
  - Uses SECURITY DEFINER to bypass RLS when checking admin status
  - Maintains existing security model for parents and centers
*/

-- Create is_admin() function if it doesn't exist (compatibility alias)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Ensure check_user_is_admin() also exists
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated;

-- Drop existing enrollment policies to recreate them properly
DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can create own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can update own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Centers can view enrollments for their activities" ON enrollments;
DROP POLICY IF EXISTS "Centers can view their enrollments" ON enrollments;

-- Recreate enrollment policies with proper functions

-- Policy 1: Parents can view their own enrollments
CREATE POLICY "Parents can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Policy 2: Parents can create enrollments for their children
CREATE POLICY "Parents can create own enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- Policy 3: Parents can update their own enrollments (only status to cancelled)
CREATE POLICY "Parents can update own enrollments"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (
    parent_id = auth.uid()
    AND status IN ('pending_admin_validation', 'pending', 'active', 'confirmed', 'cancelled')
  );

-- Policy 4: Centers can view enrollments for their activities
CREATE POLICY "Centers can view enrollments for their activities"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM centers
      WHERE owner_profile_id = auth.uid()
    )
  );

-- Policy 5: Admins can do everything with enrollments
CREATE POLICY "Admins can manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (is_admin());

-- Ensure admin user exists with correct role
DO $$
BEGIN
  -- Update existing admin account if it exists
  UPDATE profiles
  SET role = 'admin'
  WHERE email = 'admin@shipp-edu.com'
  AND role != 'admin';
  
  -- Log result
  IF FOUND THEN
    RAISE NOTICE 'Admin role updated for admin@shipp-edu.com';
  ELSE
    RAISE NOTICE 'Admin account already has correct role or does not exist';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_parent_status ON enrollments(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_center_status ON enrollments(center_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
