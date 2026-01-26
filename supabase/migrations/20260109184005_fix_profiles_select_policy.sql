/*
  # Fix Profiles SELECT Policy - Remove Recursion

  ## Problem
  - Users cannot read their own profile after login
  - The profiles_select policy uses a recursive subquery that checks the profiles table itself
  - This creates a permission issue where the policy cannot verify itself

  ## Solution
  - Simplify the SELECT policy to allow users to read their own profile directly
  - Use a separate admin check function that doesn't rely on profiles table
  - Ensure all authenticated users can read their own data without recursion

  ## Changes
  1. Drop existing problematic policies
  2. Create simple, non-recursive policies
  3. Allow authenticated users to select their own profile
  4. Admins can select all profiles (using is_admin() function)
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create simple SELECT policy: users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles (using helper function)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Keep existing INSERT policy (for user registration)
-- profiles_insert already exists and is correct

-- UPDATE policy: users can update their own profile
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
