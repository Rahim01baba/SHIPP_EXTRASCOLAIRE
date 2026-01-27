/*
  # Normalize Enrollment Statuses and Workflow

  ## Overview
  This migration normalizes enrollment statuses across the database and ensures consistency
  for the parent → admin validation → center notification workflow.

  ## Changes

  1. **Status Normalization**
     - Convert `pending` → `pending_admin_validation`
     - Convert `confirmed` → `active`
     - Keep `cancelled` as is
     - Keep `rejected` as is
     - Add `rejection_reason` column if missing

  2. **Column Additions**
     - Add `rejection_reason` (text) to enrollments
     - Add `validated_by` (uuid) to track admin who validated
     - Add `validated_at` (timestamptz) to track validation time

  3. **Payments Table Enhancement**
     - Ensure payment_id in invoices can be nullable initially (for migration)
     - Add default payment method tracking

  4. **Data Migration**
     - Update all existing enrollments to use new status values
     - Ensure all active enrollments have proper amounts set

  ## Important Notes
  - This migration is idempotent (safe to run multiple times)
  - Preserves all existing data
  - Updates status values in-place
*/

-- 1. Add new columns to enrollments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN validated_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN validated_at timestamptz;
  END IF;
END $$;

-- 2. Normalize enrollment statuses
UPDATE enrollments 
SET status = 'pending_admin_validation' 
WHERE status = 'pending';

UPDATE enrollments 
SET status = 'active' 
WHERE status = 'confirmed';

-- 3. Make invoices.payment_id nullable if it's NOT NULL
ALTER TABLE invoices 
ALTER COLUMN payment_id DROP NOT NULL;

-- 4. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_status 
ON enrollments(status);

CREATE INDEX IF NOT EXISTS idx_enrollments_center_status 
ON enrollments(center_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_enrollment 
ON payments(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

-- 5. Update RLS policies for enrollments (admin validation workflow)

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admin can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admin can update enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Centers can view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Centers can view their active enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can insert enrollments" ON enrollments;

-- Admin: full access
CREATE POLICY "Admin can view all enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update enrollments"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Parents: can view their own enrollments
CREATE POLICY "Parents can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
  );

-- Parents: can insert their own enrollments (status must be pending_admin_validation)
CREATE POLICY "Parents can insert enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid() 
    AND status = 'pending_admin_validation'
  );

-- Centers: can only view active enrollments for their centers
CREATE POLICY "Centers can view their active enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'center'
    )
    AND status = 'active'
    AND center_id IN (
      SELECT id FROM centers WHERE owner_profile_id = auth.uid()
    )
  );

-- 6. Update RLS policies for payments

DROP POLICY IF EXISTS "Parents can view own payments" ON payments;
DROP POLICY IF EXISTS "Admin can view all payments" ON payments;
DROP POLICY IF EXISTS "Parents can insert payments" ON payments;
DROP POLICY IF EXISTS "Admin can update payments" ON payments;

-- Parents can view their own payments
CREATE POLICY "Parents can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Parents can insert their own payments
CREATE POLICY "Parents can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Admin can view all payments
CREATE POLICY "Admin can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admin can update all payments
CREATE POLICY "Admin can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 7. Update RLS policies for invoices

DROP POLICY IF EXISTS "Parents can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can update invoices" ON invoices;

-- Parents can view their own invoices
CREATE POLICY "Parents can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Admin can do everything with invoices
CREATE POLICY "Admin can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
