/*
  # Migrate Enrollment Status from 'pending' to 'pending_admin_validation'

  ## Problem
  Legacy enrollments may have status 'pending' which has been deprecated.
  The new standard is 'pending_admin_validation'.

  ## Changes
  1. Update all enrollments with status 'pending' to 'pending_admin_validation'
  2. Log the number of updated records
  
  ## Security
  - No RLS changes needed
  - This is a data migration only
*/

-- Update all enrollments with status 'pending' to 'pending_admin_validation'
DO $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE enrollments
  SET status = 'pending_admin_validation'
  WHERE status = 'pending';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '✓ Migrated % enrollment(s) from "pending" to "pending_admin_validation"', updated_count;
  ELSE
    RAISE NOTICE '✓ No enrollments with status "pending" found (already migrated or none exist)';
  END IF;
END $$;

-- Verify migration
DO $$
DECLARE
  pending_count INT;
  pending_admin_count INT;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM enrollments
  WHERE status = 'pending';
  
  SELECT COUNT(*) INTO pending_admin_count
  FROM enrollments
  WHERE status = 'pending_admin_validation';
  
  RAISE NOTICE '📊 Status after migration:';
  RAISE NOTICE '  - Enrollments with status "pending": %', pending_count;
  RAISE NOTICE '  - Enrollments with status "pending_admin_validation": %', pending_admin_count;
END $$;
