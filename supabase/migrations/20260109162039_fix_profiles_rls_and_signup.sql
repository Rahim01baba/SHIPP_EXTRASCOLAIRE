/*
  # Fix Profiles RLS and Signup Issues
  
  ## Problem
  User signup fails with "Database error saving new user" because:
  1. RLS policies are too restrictive (no INSERT policy)
  2. Trigger needs to handle all edge cases
  3. Table structure may have NOT NULL constraints without defaults
  
  ## Solution
  1. Fix table structure - ensure nullable or default values
  2. Add comprehensive RLS policies for signup flow
  3. Improve trigger robustness
  
  ## Changes
  1. Table structure fixes
     - Make optional columns nullable
     - Add default values where appropriate
  
  2. RLS Policies
     - Users can read their own profile
     - Admins can read all profiles (using security definer function)
     - Users can update their own profile
     - NO explicit INSERT policy needed (trigger uses SECURITY DEFINER)
  
  3. Trigger improvements
     - Better error handling
     - Comprehensive logging
     - Handle all metadata fields
*/

-- First, ensure the profiles table structure is correct
-- Make optional columns nullable to prevent insert failures
DO $$ 
BEGIN
  -- Make phone nullable if it exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'phone' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
  END IF;

  -- Make address nullable if it exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'address' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN address DROP NOT NULL;
  END IF;

  -- Make zone_id nullable if it exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'zone_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN zone_id DROP NOT NULL;
  END IF;

  -- Make center_id nullable if it exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'center_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN center_id DROP NOT NULL;
  END IF;
END $$;

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_phone text;
  v_email text;
BEGIN
  -- Extract and validate role
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  
  -- Validate role is one of the allowed values
  IF v_role NOT IN ('admin', 'parent', 'center') THEN
    v_role := 'parent';
  END IF;

  -- Extract other metadata with safe defaults
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'no-email@example.com');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(v_email, '@', 1)
  );
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Log the attempt (visible in Supabase logs)
  RAISE LOG 'Creating profile for user %: role=%, email=%', NEW.id, v_role, v_email;

  -- Insert profile with comprehensive error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone,
      role,
      address,
      zone_id,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_phone,
      v_role::user_role,
      NEW.raw_user_meta_data->>'address',
      CASE 
        WHEN NEW.raw_user_meta_data->>'zone_id' IS NOT NULL 
        THEN (NEW.raw_user_meta_data->>'zone_id')::uuid
        ELSE NULL
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      address = EXCLUDED.address,
      zone_id = EXCLUDED.zone_id,
      updated_at = NOW();

    RAISE LOG 'Profile created successfully for user %', NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE LOG 'Error creating profile for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Re-raise the exception to fail the user creation if profile creation fails
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Now fix the RLS policies
-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can read all profiles (using security definer function)
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 4: Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Note: We do NOT add an INSERT policy because the trigger runs with SECURITY DEFINER
-- and bypasses RLS. This is intentional to prevent users from manually inserting profiles.

-- Backfill: Ensure all existing auth users have profiles
INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.email, 'no-email@example.com'),
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(au.email, 'user'), '@', 1)),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'parent'::user_role),
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

SELECT 'Profiles RLS and signup flow fixed successfully' as message;
