/*
  # Fix Admin Access and RLS Policies

  1. Functions
    - Create or replace `is_admin()` function to check if current user is admin
    - Ensures secure checking of admin role

  2. Centers RLS Policies
    - Drop old admin policies on centers
    - Create new clean policy for admins to view all centers
    - Ensures admins can see all registered centers

  3. Profiles RLS Policies
    - Create policy for admins to manage all profiles
    - Ensures admins can view and update user profiles

  4. Security
    - All policies use `is_admin()` function for consistent checks
    - Function uses SECURITY DEFINER for reliable role checking
*/

-- =====================================================
-- 1. CREATE is_admin() FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =====================================================
-- 2. FIX CENTERS RLS POLICIES
-- =====================================================

-- Drop old conflicting admin policies
DROP POLICY IF EXISTS "Admins can manage centers" ON public.centers;
DROP POLICY IF EXISTS "Admins can view all centers" ON public.centers;
DROP POLICY IF EXISTS "admins_select_all_centers" ON public.centers;

-- Create clean admin SELECT policy
CREATE POLICY "Admins can view all centers"
ON public.centers
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Create clean admin UPDATE policy
CREATE POLICY "Admins can update all centers"
ON public.centers
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- 3. FIX PROFILES RLS POLICIES
-- =====================================================

-- Drop old admin policies if they exist
DROP POLICY IF EXISTS "admins_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Create clean admin policy for profiles
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
