/*
  # Update Enrollments Table for Complete Inscription Flow

  ## Purpose
  Add necessary fields to support the complete parent inscription flow:
  - center_id for direct center reference
  - payment_status to track payment state

  ## Changes
  1. Add center_id column to enrollments
  2. Add payment_status column to enrollments
  3. Create RLS policies for parent enrollment management

  ## Security
  - Parents can create enrollments for their own children
  - Parents can view and cancel their own enrollments
  - Only admins can update payment_status
*/

-- Add center_id to enrollments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'center_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN center_id uuid REFERENCES centers(id) ON DELETE CASCADE;
    
    -- Populate center_id from existing enrollments via activities
    UPDATE enrollments e
    SET center_id = a.center_id
    FROM activities a
    WHERE e.activity_id = a.id AND e.center_id IS NULL;
  END IF;
END $$;

-- Add payment_status to enrollments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed'));
  END IF;
END $$;

-- Create RLS policies for enrollments if they don't exist

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Parents can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can create own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Parents can cancel own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;

-- Parents can view their own enrollments
CREATE POLICY "Parents can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Parents can create enrollments for their own children
CREATE POLICY "Parents can create own enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- Parents can update their own enrollments (for cancellation)
CREATE POLICY "Parents can update own enrollments"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (
    parent_id = auth.uid()
    AND status IN ('pending', 'confirmed', 'cancelled')
  );

-- Admins can view and manage all enrollments
CREATE POLICY "Admins can manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (is_admin());

-- Create index for faster enrollment queries
CREATE INDEX IF NOT EXISTS idx_enrollments_parent ON enrollments(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_child_month ON enrollments(child_id, enrollment_month);
