/*
  # Fix Centers RLS and Structure
  
  ## Problem
  - Center signup doesn't create center record
  - RLS policies need to be comprehensive
  - Status field naming (status vs validation_status)
  
  ## Solution
  1. Fix table structure
  2. Comprehensive RLS policies
  3. Allow center signup to create center record
*/

-- First, drop ALL existing policies on centers
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'centers' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON centers', pol.policyname);
  END LOOP;
END $$;

-- Make sure owner_profile_id is NOT NULL (safe since table is empty)
ALTER TABLE centers ALTER COLUMN owner_profile_id SET NOT NULL;

-- Enable RLS
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Parents see only approved and active centers
CREATE POLICY "parents_view_approved_centers"
  ON centers
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND is_active = true
  );

-- Policy 2: Center owners can view their own center
CREATE POLICY "centers_view_own"
  ON centers
  FOR SELECT
  TO authenticated
  USING (owner_profile_id = auth.uid());

-- Policy 3: Center owners can insert their own center (during signup)
CREATE POLICY "centers_insert_own"
  ON centers
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_profile_id = auth.uid());

-- Policy 4: Center owners can update their own center
CREATE POLICY "centers_update_own"
  ON centers
  FOR UPDATE
  TO authenticated
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

-- Policy 5: Admins can SELECT all centers
CREATE POLICY "admins_select_all_centers"
  ON centers
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy 6: Admins can INSERT centers
CREATE POLICY "admins_insert_centers"
  ON centers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Policy 7: Admins can UPDATE any center
CREATE POLICY "admins_update_all_centers"
  ON centers
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 8: Admins can DELETE centers
CREATE POLICY "admins_delete_centers"
  ON centers
  FOR DELETE
  TO authenticated
  USING (is_admin());

SELECT 'Centers RLS policies fixed successfully' as message;
