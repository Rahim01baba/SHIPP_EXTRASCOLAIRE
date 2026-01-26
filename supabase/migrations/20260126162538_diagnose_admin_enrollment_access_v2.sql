/*
  # Diagnostic Admin Enrollment Access v2

  This migration helps diagnose why admin users might not see enrollments.
  
  ## Tests
  1. Verify is_admin() function exists and works
  2. Check admin users in profiles table
  3. List all enrollments with their status
  4. Test RLS policies
  
  ## Note
  This is a diagnostic migration that only queries data and logs results.
  It does not modify any data or schema.
*/

-- Test 1: Check if is_admin() function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✓ is_admin() function exists';
  ELSE
    RAISE WARNING '✗ is_admin() function NOT FOUND';
  END IF;
END $$;

-- Test 2: List all admin users
DO $$
DECLARE
  admin_count INT;
  admin_record RECORD;
BEGIN
  SELECT COUNT(*) INTO admin_count 
  FROM profiles 
  WHERE role = 'admin';
  
  RAISE NOTICE '📊 Admin users count: %', admin_count;
  
  FOR admin_record IN 
    SELECT id, email, role, created_at 
    FROM profiles 
    WHERE role = 'admin'
    ORDER BY created_at
  LOOP
    RAISE NOTICE '  - Admin: % (ID: %, Created: %)', 
      admin_record.email, 
      admin_record.id, 
      admin_record.created_at;
  END LOOP;
END $$;

-- Test 3: List all enrollments with status
DO $$
DECLARE
  enrollment_count INT;
  status_record RECORD;
BEGIN
  SELECT COUNT(*) INTO enrollment_count FROM enrollments;
  RAISE NOTICE '📊 Total enrollments: %', enrollment_count;
  
  FOR status_record IN
    SELECT status, COUNT(*) as count
    FROM enrollments
    GROUP BY status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  - Status "%": % enrollments', 
      status_record.status, 
      status_record.count;
  END LOOP;
END $$;

-- Test 4: Check RLS policies on enrollments table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '📋 RLS Policies on enrollments table:';
  
  FOR policy_record IN
    SELECT 
      polname as policy_name,
      polcmd as command
    FROM pg_policy
    WHERE polrelid = 'enrollments'::regclass
    ORDER BY polname
  LOOP
    RAISE NOTICE '  - Policy: % (Command: %)', 
      policy_record.policy_name, 
      policy_record.command;
  END LOOP;
END $$;

-- Test 5: Verify RLS is enabled on enrollments
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'enrollments';
  
  IF rls_enabled THEN
    RAISE NOTICE '✓ RLS is ENABLED on enrollments table';
  ELSE
    RAISE WARNING '✗ RLS is NOT ENABLED on enrollments table';
  END IF;
END $$;

-- Test 6: Show recent enrollments
DO $$
DECLARE
  enrollment_record RECORD;
BEGIN
  RAISE NOTICE '📝 Recent enrollments (last 5):';
  
  FOR enrollment_record IN
    SELECT id, parent_id, status, created_at
    FROM enrollments
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  - ID: % | Status: % | Created: %',
      enrollment_record.id,
      enrollment_record.status,
      enrollment_record.created_at;
  END LOOP;
END $$;
