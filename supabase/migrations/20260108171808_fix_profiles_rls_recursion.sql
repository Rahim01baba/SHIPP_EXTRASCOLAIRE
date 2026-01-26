/*
  # Fix RLS Recursion on Profiles Table

  ## Problem
  The policy "Admins can view all profiles" creates infinite recursion by querying
  the profiles table from within a policy on the profiles table.

  ## Solution
  1. Drop the problematic policy
  2. Create a helper function that uses security definer to break the recursion
  3. Recreate the admin policy using the helper function

  ## Changes
  - Drop existing "Admins can view all profiles" policy
  - Create `is_admin()` security definer function
  - Recreate admin policy using the function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a security definer function to check admin status
-- This breaks the recursion by using a function with elevated privileges
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin policy using the helper function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());
