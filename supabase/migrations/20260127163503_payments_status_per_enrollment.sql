/*
  # Add Payment Status Management to Enrollments

  1. New Columns in enrollments table
    - `payment_status` (text) - Payment status: pending, paid, late, cancelled
    - `paid_at` (timestamptz) - When payment was marked as paid
    - `payment_note` (text) - Optional note about payment
    - `payment_marked_by` (uuid) - Reference to admin who marked payment status

  2. Indexes
    - Add index on payment_status for fast filtering

  3. RLS Policies
    - Allow admins to update payment status on enrollments

  4. Security
    - Parents can view their payment status (read-only)
    - Only admins can modify payment status
*/

-- =====================================================
-- 1. ADD PAYMENT STATUS COLUMNS TO ENROLLMENTS
-- =====================================================

DO $$
BEGIN
  -- Add payment_status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='payment_status'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
    
    COMMENT ON COLUMN public.enrollments.payment_status IS
      'Payment status: pending (waiting), paid (confirmed), late (overdue), cancelled (voided)';
  END IF;

  -- Add paid_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='paid_at'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN paid_at timestamptz;
    
    COMMENT ON COLUMN public.enrollments.paid_at IS
      'Timestamp when payment was marked as paid by admin';
  END IF;

  -- Add payment_note column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='payment_note'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN payment_note text;
    
    COMMENT ON COLUMN public.enrollments.payment_note IS
      'Optional note about payment status or issues';
  END IF;

  -- Add payment_marked_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='payment_marked_by'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN payment_marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.enrollments.payment_marked_by IS
      'Admin user who last modified the payment status';
  END IF;
END $$;

-- =====================================================
-- 2. ADD CHECK CONSTRAINT FOR PAYMENT STATUS VALUES
-- =====================================================

-- First, ensure all existing rows have valid payment_status
UPDATE public.enrollments
SET payment_status = 'pending'
WHERE payment_status IS NULL OR payment_status NOT IN ('pending', 'paid', 'late', 'cancelled');

-- Add check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'enrollments' AND constraint_name = 'enrollments_payment_status_check'
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'late', 'cancelled'));
  END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEX FOR FAST PAYMENT STATUS FILTERING
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status 
ON public.enrollments(payment_status)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_enrollments_payment_parent 
ON public.enrollments(parent_id, payment_status)
WHERE is_deleted = false;

-- =====================================================
-- 4. ADD RLS POLICY FOR ADMIN PAYMENT MANAGEMENT
-- =====================================================

-- Drop existing policy if present
DROP POLICY IF EXISTS admins_update_payments_on_enrollments ON public.enrollments;

-- Create policy allowing admins to update payment fields
CREATE POLICY admins_update_payments_on_enrollments
ON public.enrollments
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- =====================================================
-- 5. ENSURE PARENTS CAN VIEW PAYMENT STATUS
-- =====================================================

-- Parents can already SELECT their own enrollments via existing policies
-- No additional policy needed, just ensure payment_status is included in SELECT

-- =====================================================
-- 6. ADD TRIGGER TO SYNC WITH PAYMENTS TABLE (OPTIONAL)
-- =====================================================

-- This trigger syncs enrollment payment_status with payments table
-- Only runs if payments table exists and has matching records

CREATE OR REPLACE FUNCTION public.sync_payment_status_to_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If payment_status changed to 'paid', update payments table
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE public.payments
    SET 
      status = 'paid',
      paid_at = NEW.paid_at
    WHERE enrollment_id = NEW.id
      AND status != 'paid';
  END IF;

  -- If payment_status changed to 'late', update payments table
  IF NEW.payment_status = 'late' AND OLD.payment_status != 'late' THEN
    UPDATE public.payments
    SET 
      status = 'late',
      paid_at = NULL
    WHERE enrollment_id = NEW.id;
  END IF;

  -- If payment_status changed to 'cancelled', update payments table
  IF NEW.payment_status = 'cancelled' AND OLD.payment_status != 'cancelled' THEN
    UPDATE public.payments
    SET 
      status = 'cancelled',
      paid_at = NULL
    WHERE enrollment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS trg_sync_payment_status_to_payments ON public.enrollments;

-- Create trigger (only fires on payment_status changes)
CREATE TRIGGER trg_sync_payment_status_to_payments
AFTER UPDATE OF payment_status, paid_at ON public.enrollments
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.paid_at IS DISTINCT FROM NEW.paid_at)
EXECUTE FUNCTION public.sync_payment_status_to_payments();

-- =====================================================
-- 7. CREATE HELPER VIEW FOR PAYMENT OVERVIEW (OPTIONAL)
-- =====================================================

CREATE OR REPLACE VIEW public.enrollments_payment_summary AS
SELECT 
  parent_id,
  COUNT(*) as total_enrollments,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE payment_status = 'late') as late_count,
  COUNT(*) FILTER (WHERE payment_status = 'cancelled') as cancelled_count,
  SUM(total_amount) FILTER (WHERE payment_status = 'paid') as total_paid,
  SUM(total_amount) FILTER (WHERE payment_status IN ('pending', 'late')) as total_outstanding
FROM public.enrollments
WHERE is_deleted = false AND status != 'cancelled'
GROUP BY parent_id;

COMMENT ON VIEW public.enrollments_payment_summary IS
'Aggregated payment status by parent for quick dashboard display';
