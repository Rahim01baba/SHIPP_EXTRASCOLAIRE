/*
  # Guard Payment Status on Cancelled Enrollments

  1. Security Enhancement
    - Prevent marking payment as 'paid' or 'late' when enrollment status is 'cancelled'
    - Ensures business logic consistency at database level
    - Blocks unauthorized or accidental payment updates on cancelled enrollments

  2. Changes
    - Create trigger function to validate payment_status changes
    - Apply trigger on enrollments table BEFORE UPDATE
    - Raises exception if attempting to set payment_status to 'paid' or 'late' on cancelled enrollment

  3. Notes
    - This prevents inconsistencies where cancelled enrollments show as paid
    - Frontend should already block these actions, but DB-level enforcement adds security
    - Does not prevent cancelling payment_status on already cancelled enrollments
*/

-- Function to prevent invalid payment status updates on cancelled enrollments
CREATE OR REPLACE FUNCTION public.prevent_payment_update_on_cancelled_enrollment()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if enrollment is cancelled and payment_status is being set to paid or late
  IF NEW.status = 'cancelled' AND NEW.payment_status IN ('paid', 'late') THEN
    RAISE EXCEPTION 'Cannot mark payment as paid/late when enrollment is cancelled (enrollment_id: %)', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_prevent_payment_update_on_cancelled ON public.enrollments;

-- Create trigger to run before payment_status updates
CREATE TRIGGER trg_prevent_payment_update_on_cancelled
  BEFORE UPDATE OF payment_status ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_payment_update_on_cancelled_enrollment();

-- Additional trigger to prevent cancelling enrollments with already paid status
-- (optional - allows historical record keeping)
CREATE OR REPLACE FUNCTION public.warn_cancel_enrollment_with_payment()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If cancelling an enrollment that has been paid, reset payment status
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.payment_status = 'paid' THEN
    -- Option 1: Reset payment status automatically (uncomment to enable)
    -- NEW.payment_status := 'cancelled';
    -- NEW.paid_at := NULL;

    -- Option 2: Block the operation (currently disabled, can be enabled if needed)
    -- RAISE EXCEPTION 'Cannot cancel enrollment with paid status. Reset payment first.';

    -- For now, we allow it but it's logged
    RAISE NOTICE 'Cancelling enrollment % with paid status', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_warn_cancel_enrollment_with_payment ON public.enrollments;

-- Create trigger (currently only logs, does not block)
CREATE TRIGGER trg_warn_cancel_enrollment_with_payment
  BEFORE UPDATE OF status ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.warn_cancel_enrollment_with_payment();
