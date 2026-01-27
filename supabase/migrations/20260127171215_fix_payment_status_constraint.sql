/*
  # Fix Payment Status CHECK Constraint

  ## Problem
  The existing CHECK constraint on enrollments.payment_status only allows:
  - 'pending'
  - 'completed'
  
  But the application uses these values:
  - 'pending' ✓
  - 'paid' (was trying to use this instead of 'completed')
  - 'late'
  - 'cancelled'

  ## Solution
  1. Drop the old constraint
  2. Update any 'completed' values to 'paid' for consistency
  3. Add new constraint with correct allowed values
  
  ## Changes
  - Drop constraint: enrollments_payment_status_check
  - Migrate data: 'completed' → 'paid'
  - Add new constraint with: 'pending', 'paid', 'late', 'cancelled'
*/

-- =====================================================
-- 1. DROP OLD CHECK CONSTRAINT
-- =====================================================

DO $$
BEGIN
  -- Drop the old constraint that only allows 'pending' and 'completed'
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'enrollments' 
    AND constraint_name = 'enrollments_payment_status_check'
  ) THEN
    ALTER TABLE public.enrollments
      DROP CONSTRAINT enrollments_payment_status_check;
    
    RAISE NOTICE 'Dropped old payment_status constraint';
  END IF;
END $$;

-- =====================================================
-- 2. MIGRATE EXISTING DATA
-- =====================================================

-- Update any 'completed' values to 'paid' for consistency
UPDATE public.enrollments
SET payment_status = 'paid'
WHERE payment_status = 'completed';

-- Ensure all rows have valid payment_status
UPDATE public.enrollments
SET payment_status = 'pending'
WHERE payment_status IS NULL 
   OR payment_status NOT IN ('pending', 'paid', 'late', 'cancelled');

-- =====================================================
-- 3. ADD NEW CHECK CONSTRAINT WITH CORRECT VALUES
-- =====================================================

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'late', 'cancelled'));

COMMENT ON CONSTRAINT enrollments_payment_status_check ON public.enrollments IS
  'Valid payment statuses: pending (waiting), paid (confirmed), late (overdue), cancelled (voided)';

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

-- Verify the constraint is correct
DO $$
DECLARE
  constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conrelid = 'public.enrollments'::regclass
    AND conname = 'enrollments_payment_status_check';
  
  RAISE NOTICE 'New constraint definition: %', constraint_def;
END $$;
