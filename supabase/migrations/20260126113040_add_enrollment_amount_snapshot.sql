/*
  # Add Enrollment Amount Snapshot Columns

  ## Problem
  Parent dashboard shows only course price (25,000) instead of total with transport (50,000)
  When admin changes transport fees, historical enrollments should keep their original prices
  
  ## Solution
  Add snapshot columns to enrollments table to store pricing at time of enrollment:
  - course_amount: Course price at enrollment time
  - transport_amount: Transport price at enrollment time  
  - total_amount: Total (course + transport) at enrollment time
  
  ## Changes
  1. Add three new amount columns to enrollments
  2. Migrate existing data by calculating from current activity prices
  3. Update trigger to auto-calculate total from course + transport when inserting
  
  ## Migration Strategy
  For existing enrollments, calculate amounts from current activity data
  New enrollments will store snapshot values at creation time
*/

-- 1) Add amount columns to enrollments table
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS course_amount INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_amount INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.enrollments.course_amount IS 'Course price at time of enrollment (snapshot)';
COMMENT ON COLUMN public.enrollments.transport_amount IS 'Transport price at time of enrollment (snapshot)';
COMMENT ON COLUMN public.enrollments.total_amount IS 'Total amount (course + transport) at time of enrollment (snapshot)';

-- 2) Migrate existing enrollment data
-- Calculate amounts from current activity prices
UPDATE public.enrollments e
SET 
  course_amount = COALESCE(a.course_price, 0),
  transport_amount = COALESCE(a.transport_price, 0),
  total_amount = COALESCE(a.course_price, 0) + COALESCE(a.transport_price, 0)
FROM public.activities a
WHERE e.activity_id = a.id
AND (e.course_amount = 0 OR e.transport_amount = 0 OR e.total_amount = 0);

-- 3) Create trigger function to auto-populate amounts on insert
CREATE OR REPLACE FUNCTION public.populate_enrollment_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_course_price INTEGER;
  activity_transport_price INTEGER;
BEGIN
  -- If amounts are not provided, fetch from activity
  IF NEW.course_amount = 0 OR NEW.transport_amount = 0 THEN
    SELECT 
      COALESCE(a.course_price, 0),
      COALESCE(a.transport_price, 0)
    INTO 
      activity_course_price,
      activity_transport_price
    FROM public.activities a
    WHERE a.id = NEW.activity_id;
    
    -- Set the snapshot values
    NEW.course_amount := COALESCE(NEW.course_amount, activity_course_price, 0);
    NEW.transport_amount := COALESCE(NEW.transport_amount, activity_transport_price, 0);
  END IF;
  
  -- Always calculate total
  NEW.total_amount := NEW.course_amount + NEW.transport_amount;
  
  RETURN NEW;
END;
$$;

-- 4) Create trigger to run before insert/update
DROP TRIGGER IF EXISTS trg_populate_enrollment_amounts ON public.enrollments;

CREATE TRIGGER trg_populate_enrollment_amounts
BEFORE INSERT OR UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.populate_enrollment_amounts();

-- 5) Drop old columns if they exist and are different from new ones
DO $$
BEGIN
  -- Check if old pricing columns exist and are different
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'course_price'
  ) THEN
    -- Migrate data from old columns if they have values
    UPDATE public.enrollments
    SET 
      course_amount = COALESCE(course_price, course_amount),
      transport_amount = COALESCE(transport_price, transport_amount),
      total_amount = COALESCE(total_price, total_amount)
    WHERE course_price IS NOT NULL OR transport_price IS NOT NULL OR total_price IS NOT NULL;
    
    -- Drop old columns
    ALTER TABLE public.enrollments DROP COLUMN IF EXISTS course_price;
    ALTER TABLE public.enrollments DROP COLUMN IF EXISTS transport_price;
    ALTER TABLE public.enrollments DROP COLUMN IF EXISTS total_price;
  END IF;
END $$;
