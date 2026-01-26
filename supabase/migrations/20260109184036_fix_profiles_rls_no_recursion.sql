/*
  # Fix Profiles RLS - Remove ALL Recursion

  ## Problem
  - Profiles SELECT policies have recursive subqueries that check the profiles table itself
  - This creates a deadlock: to read profiles, you need to read profiles
  - Users see "Profil introuvable" error after successful authentication

  ## Solution
  - Remove ALL policies with recursive subqueries
  - Create simple, direct policies without subqueries
  - Use SECURITY DEFINER function for admin checks to bypass RLS
  - Allow authenticated users to read their own profile directly

  ## Changes
  1. Drop ALL existing profiles policies
  2. Create SECURITY DEFINER function for admin role check
  3. Create simple, non-recursive policies
*/

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create SECURITY DEFINER function to check if user is admin
-- This function bypasses RLS to check the role
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated;

-- CREATE SIMPLE POLICIES WITHOUT RECURSION

-- SELECT: Users can read their own profile (no subquery)
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- SELECT: Admins can read all profiles (using SECURITY DEFINER function)
CREATE POLICY "Admins read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (check_user_is_admin());

-- INSERT: Users can insert their own profile during registration
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- INSERT: Admins can insert any profile
CREATE POLICY "Admins insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (check_user_is_admin());

-- UPDATE: Users can update their own profile
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admins can update any profile
CREATE POLICY "Admins update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (check_user_is_admin())
  WITH CHECK (check_user_is_admin());

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (check_user_is_admin());
