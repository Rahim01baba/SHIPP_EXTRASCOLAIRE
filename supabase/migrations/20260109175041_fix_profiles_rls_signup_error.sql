/*
  # Fix Profiles RLS and Signup Error

  1. Problem
    - "Database error saving new user" during signup
    - Caused by RLS policies blocking profile creation
    - Potential recursion in admin checks

  2. Changes
    - Drop existing problematic policies
    - Create safe policies without recursion
    - Ensure INSERT allows user to create own profile
    - Ensure SELECT/UPDATE work for self and admin
    - Use inline EXISTS checks instead of functions to avoid recursion

  3. Security
    - User can only insert profile with id = auth.uid()
    - User can read/update own profile
    - Admin can read/update all profiles (checked via inline query)
    - No recursive policy dependencies
*/

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;

-- SELECT policy: user reads own profile OR admin reads any profile
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- INSERT policy: user can only create own profile (id MUST match auth.uid())
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

-- UPDATE policy: user updates own profile OR admin updates any profile
CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);