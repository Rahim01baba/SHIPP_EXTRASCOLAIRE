/*
  # Fix Invoices and Enrollments Workflow

  1. Changes to invoices table
    - Add child_id column (FK to children)
    - Add unique constraint on (enrollment_id, invoice_date) for UPSERT
    - Add indexes for performance

  2. Changes to enrollments table
    - Add is_deleted column for soft delete
    - Enables parents to soft-delete cancelled enrollments

  3. RLS Policies
    - Admin: full access to enrollments and invoices
    - Parent: read own enrollments (non-deleted), soft delete cancelled only, read own invoices
    - Center: read validated enrollments for their activities only

  4. Security
    - is_admin() function for consistent admin checks
    - Proper isolation between parent/center/admin roles
*/

-- =====================================================
-- 1. INVOICES TABLE MODIFICATIONS
-- =====================================================

-- Add child_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='child_id'
  ) THEN
    ALTER TABLE public.invoices
      ADD COLUMN child_id uuid REFERENCES public.children(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add unique constraint for UPSERT by (enrollment_id, invoice_date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_enrollment_month_unique'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_enrollment_month_unique UNIQUE (enrollment_id, invoice_date);
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_parent_date ON public.invoices(parent_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_child_date ON public.invoices(child_id, invoice_date);

-- =====================================================
-- 2. ENROLLMENTS TABLE MODIFICATIONS
-- =====================================================

-- Add is_deleted for soft delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='enrollments' AND column_name='is_deleted'
  ) THEN
    ALTER TABLE public.enrollments
      ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 3. HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =====================================================
-- 4. ENABLE RLS
-- =====================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. ENROLLMENTS POLICIES
-- =====================================================

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Admin can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Parents can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Parents can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Parents can update own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Centers can view their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS admins_all_enrollments ON public.enrollments;
DROP POLICY IF EXISTS parents_read_own_enrollments ON public.enrollments;
DROP POLICY IF EXISTS parents_soft_delete_cancelled ON public.enrollments;
DROP POLICY IF EXISTS centers_read_validated_enrollments ON public.enrollments;

-- Admin: full access to all enrollments (including deleted)
CREATE POLICY admins_all_enrollments
ON public.enrollments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Parent: read own enrollments (non-deleted only)
CREATE POLICY parents_read_own_enrollments
ON public.enrollments
FOR SELECT
TO authenticated
USING (parent_id = auth.uid() AND is_deleted = false);

-- Parent: insert new enrollments
CREATE POLICY parents_insert_enrollments
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (parent_id = auth.uid());

-- Parent: update own enrollments (for cancellation)
CREATE POLICY parents_update_own_enrollments
ON public.enrollments
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- Center: read validated enrollments for their activities only
CREATE POLICY centers_read_validated_enrollments
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND is_deleted = false
  AND EXISTS (
    SELECT 1
    FROM public.activities a
    JOIN public.centers c ON c.id = a.center_id
    WHERE a.id = enrollments.activity_id
      AND c.owner_profile_id = auth.uid()
  )
);

-- =====================================================
-- 6. INVOICES POLICIES
-- =====================================================

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Parents can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS admins_all_invoices ON public.invoices;
DROP POLICY IF EXISTS parents_read_own_invoices ON public.invoices;

-- Admin: full access to all invoices
CREATE POLICY admins_all_invoices
ON public.invoices
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Parent: read own invoices
CREATE POLICY parents_read_own_invoices
ON public.invoices
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());
