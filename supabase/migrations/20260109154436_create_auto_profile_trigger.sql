/*
  # Auto-Create Profile Trigger
  
  ## Problem
  Currently profiles are created manually in the frontend, which can lead to:
  - Race conditions and timing issues
  - Missing profiles causing "Profile not found" errors
  - Admin users being routed to wrong interfaces
  - Infinite loops in AuthContext
  
  ## Solution
  Create a database trigger that automatically creates a profile entry
  whenever a new user is created in auth.users.
  
  ## Changes
  1. Create function to auto-create profile
  2. Create trigger on auth.users INSERT
  3. Default role is 'parent' (can be changed via signUp metadata)
  4. Ensure idempotency with ON CONFLICT
  
  ## Security
  - Trigger runs with SECURITY DEFINER to bypass RLS
  - Only creates profile if it doesn't exist
  - Uses user metadata from auth.users for initial data
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with data from auth.users
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    address,
    zone_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent'::user_role),
    NEW.raw_user_meta_data->>'address',
    (NEW.raw_user_meta_data->>'zone_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure all existing auth users have profiles
-- This is safe to run multiple times
INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'parent'::user_role)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

SELECT 'Auto-profile trigger created successfully' as message;
