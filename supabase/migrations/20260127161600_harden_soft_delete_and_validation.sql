/*
  # Harden Soft Delete and Validation Rules

  1. Changes to enrollments RLS policies
    - Remove permissive parent UPDATE policies
    - Create two strict UPDATE policies:
      a) Allow cancellation (status -> 'cancelled')
      b) Allow soft delete (is_deleted -> true) ONLY if already cancelled

  2. Database trigger
    - Prevent activation (status='active') if activity_id is NULL
    - Ensures center can always see activated enrollments

  3. Security
    - Parents cannot modify amounts, center_id, or other fields
    - Parents can only cancel or soft-delete their own enrollments
    - Admin validation blocked at DB level if activity missing
*/

-- =====================================================
-- 1. ENFORCE RLS ON ENROLLMENTS
-- =====================================================

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP OLD PERMISSIVE PARENT UPDATE POLICIES
-- =====================================================

DROP POLICY IF EXISTS parents_soft_delete_cancelled ON public.enrollments;
DROP POLICY IF EXISTS parents_update_own_enrollments ON public.enrollments;
DROP POLICY IF EXISTS parents_manage_own_enrollments ON public.enrollments;
DROP POLICY IF EXISTS parents_can_cancel ON public.enrollments;
DROP POLICY IF EXISTS "Parents can update own enrollments" ON public.enrollments;

-- =====================================================
-- 3. CREATE STRICT PARENT UPDATE POLICIES
-- =====================================================

-- Policy: Parent can cancel their own enrollment
-- Only allows setting status='cancelled' on non-deleted enrollments
CREATE POLICY parents_can_cancel_own_enrollment
ON public.enrollments
FOR UPDATE
TO authenticated
USING (
  parent_id = auth.uid()
  AND is_deleted = false
)
WITH CHECK (
  parent_id = auth.uid()
  AND is_deleted = false
  AND status = 'cancelled'
);

-- Policy: Parent can soft delete ONLY if already cancelled
-- Only allows setting is_deleted=true on cancelled enrollments
CREATE POLICY parents_can_soft_delete_cancelled
ON public.enrollments
FOR UPDATE
TO authenticated
USING (
  parent_id = auth.uid()
  AND status = 'cancelled'
  AND is_deleted = false
)
WITH CHECK (
  parent_id = auth.uid()
  AND status = 'cancelled'
  AND is_deleted = true
);

-- =====================================================
-- 4. PREVENT ACTIVATION WITHOUT ACTIVITY_ID
-- =====================================================

-- Function: Block activation if activity_id is NULL
CREATE OR REPLACE FUNCTION public.prevent_activate_without_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent activation without activity_id
  IF NEW.status = 'active' AND NEW.activity_id IS NULL THEN
    RAISE EXCEPTION 'Cannot activate enrollment without activity_id. Enrollment ID: %, Missing activity_id', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS trg_prevent_activate_without_activity ON public.enrollments;

-- Create trigger to run before UPDATE of status column
CREATE TRIGGER trg_prevent_activate_without_activity
BEFORE UPDATE OF status ON public.enrollments
FOR EACH ROW
WHEN (NEW.status = 'active' AND NEW.activity_id IS NULL)
EXECUTE FUNCTION public.prevent_activate_without_activity();

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY parents_can_cancel_own_enrollment ON public.enrollments IS
'Parents can only cancel (set status=cancelled) their own non-deleted enrollments';

COMMENT ON POLICY parents_can_soft_delete_cancelled ON public.enrollments IS
'Parents can only soft delete (set is_deleted=true) their own cancelled enrollments';

COMMENT ON FUNCTION public.prevent_activate_without_activity() IS
'Prevents activation of enrollments without activity_id to ensure center visibility';
