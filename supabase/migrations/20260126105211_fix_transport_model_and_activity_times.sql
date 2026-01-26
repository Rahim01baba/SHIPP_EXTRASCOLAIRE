/*
  # Fix Transport Model and Activity Time Fields

  ## Problem Identified
  1. Activity creation fails with "null value in column start_time violates not-null constraint"
     - The form sends schedule_start/schedule_end but database expects start_time/end_time
     - Activities table has duplicate time columns causing confusion
  
  2. Transport pricing model needs restructuring:
     - Transport should be defined per center by admin, not per activity
     - Centers should not set transport fees themselves
  
  ## Changes Made
  
  1. Centers Table
     - Add transport_fee_monthly column (default 0)
     - This is set by admin and applies to all activities of that center
  
  2. Activities Table
     - Consolidate time fields: make start_time/end_time nullable temporarily
     - Copy data from schedule_start/schedule_end to start_time/end_time
     - Drop duplicate schedule_start/schedule_end columns
     - Set start_time/end_time back to NOT NULL
     - Make transport_price nullable (will be calculated from center's transport_fee_monthly)
  
  3. Data Migration
     - Copy existing schedule times to standard time fields
     - Preserve existing activity data
*/

-- 1) Add transport_fee_monthly to centers
ALTER TABLE public.centers
ADD COLUMN IF NOT EXISTS transport_fee_monthly INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.centers.transport_fee_monthly IS 'Monthly transport fee set by admin, applied to all activities of this center';

-- 2) Make start_time/end_time nullable temporarily to allow data migration
ALTER TABLE public.activities
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

-- 3) Copy schedule_start/schedule_end to start_time/end_time if they exist
UPDATE public.activities
SET 
  start_time = COALESCE(start_time, schedule_start, '09:00'::time),
  end_time = COALESCE(end_time, schedule_end, '11:00'::time)
WHERE start_time IS NULL OR end_time IS NULL;

-- 4) Drop duplicate schedule columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_start'
  ) THEN
    ALTER TABLE public.activities DROP COLUMN schedule_start;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_end'
  ) THEN
    ALTER TABLE public.activities DROP COLUMN schedule_end;
  END IF;
END $$;

-- 5) Set start_time/end_time back to NOT NULL with defaults
ALTER TABLE public.activities
ALTER COLUMN start_time SET DEFAULT '09:00'::time,
ALTER COLUMN end_time SET DEFAULT '11:00'::time,
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- 6) Make transport_price nullable (will be auto-calculated from center's transport_fee_monthly)
ALTER TABLE public.activities
ALTER COLUMN transport_price DROP NOT NULL,
ALTER COLUMN transport_price SET DEFAULT 0;

-- 7) Drop duplicate columns if they exist (schedule_day vs day_of_week)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_day'
  ) THEN
    -- Copy schedule_day to day_of_week if day_of_week is null
    UPDATE public.activities
    SET day_of_week = COALESCE(day_of_week, schedule_day, 6)
    WHERE day_of_week IS NULL;
    
    ALTER TABLE public.activities DROP COLUMN schedule_day;
  END IF;
END $$;

-- 8) Drop duplicate price columns if they exist (price_course vs course_price, price_transport vs transport_price)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'price_course'
  ) THEN
    UPDATE public.activities
    SET course_price = COALESCE(course_price, price_course, 0)
    WHERE course_price IS NULL OR course_price = 0;
    
    ALTER TABLE public.activities DROP COLUMN price_course;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'price_transport'
  ) THEN
    UPDATE public.activities
    SET transport_price = COALESCE(transport_price, price_transport, 0)
    WHERE transport_price IS NULL OR transport_price = 0;
    
    ALTER TABLE public.activities DROP COLUMN price_transport;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'capacity'
  ) THEN
    UPDATE public.activities
    SET max_participants = COALESCE(max_participants, capacity, 20)
    WHERE max_participants IS NULL OR max_participants = 0;
    
    ALTER TABLE public.activities DROP COLUMN capacity;
  END IF;
END $$;

-- 9) Ensure day_of_week has proper default and is NOT NULL
ALTER TABLE public.activities
ALTER COLUMN day_of_week SET DEFAULT 6,
ALTER COLUMN day_of_week SET NOT NULL;

-- 10) Create index on center_id for better query performance
CREATE INDEX IF NOT EXISTS activities_center_id_idx ON public.activities(center_id);

-- 11) Update trigger to auto-calculate total_price from course_price + center's transport_fee_monthly
CREATE OR REPLACE FUNCTION public.calculate_activity_total_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  center_transport_fee INTEGER;
BEGIN
  -- Get the center's transport fee
  SELECT transport_fee_monthly INTO center_transport_fee
  FROM public.centers
  WHERE id = NEW.center_id;
  
  -- If use_global_transport is true or transport_price is null, use center's transport fee
  IF NEW.use_global_transport OR NEW.transport_price IS NULL THEN
    NEW.transport_price := COALESCE(center_transport_fee, 0);
  END IF;
  
  -- Calculate total price
  NEW.total_price := NEW.course_price + NEW.transport_price;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_activity_total_price ON public.activities;

CREATE TRIGGER trg_calculate_activity_total_price
BEFORE INSERT OR UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.calculate_activity_total_price();
