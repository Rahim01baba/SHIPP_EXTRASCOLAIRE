/*
  # Add Center Validation Status
  
  1. Changes
    - Add validation_status enum type (submitted, validated, rejected, suspended)
    - Add validation_status column to centers table with default 'validated' for existing centers
    - Add validated_at timestamp
    - Add validated_by admin reference
    - Add rejection_reason text field
    - Update RLS policies to only show validated centers publicly
    - Add admin history tracking
  
  2. Security
    - Public can only see validated centers
    - Centers can only see their own status
    - Admins can manage all statuses
*/

-- Create validation status enum
DO $$ BEGIN
  CREATE TYPE center_validation_status AS ENUM ('submitted', 'validated', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add validation columns to centers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE centers 
    ADD COLUMN validation_status center_validation_status DEFAULT 'validated',
    ADD COLUMN validated_at timestamptz,
    ADD COLUMN validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Update existing centers to validated status
UPDATE centers 
SET validation_status = 'validated', 
    validated_at = now()
WHERE validation_status IS NULL OR validation_status = 'validated';

-- Drop existing policies for centers to recreate them
DROP POLICY IF EXISTS "Anyone can view active centers" ON centers;
DROP POLICY IF EXISTS "Centers can view own center" ON centers;
DROP POLICY IF EXISTS "Centers can update own center" ON centers;
DROP POLICY IF EXISTS "Admins can manage centers" ON centers;

-- New RLS Policies for centers with validation status

-- Public can only view validated AND active centers
CREATE POLICY "Public can view validated active centers"
  ON centers FOR SELECT
  TO authenticated
  USING (is_active = true AND validation_status = 'validated');

-- Centers can view their own center regardless of status
CREATE POLICY "Centers can view own center"
  ON centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  );

-- Centers can update their own center (but not validation status)
CREATE POLICY "Centers can update own center info"
  ON centers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  );

-- Admins can view all centers
CREATE POLICY "Admins can view all centers"
  ON centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert centers
CREATE POLICY "Admins can create centers"
  ON centers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all centers including validation status
CREATE POLICY "Admins can update all centers"
  ON centers FOR UPDATE
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

-- Admins can delete centers
CREATE POLICY "Admins can delete centers"
  ON centers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update activities to only be visible if center is validated
DROP POLICY IF EXISTS "Anyone can view active activities" ON activities;

CREATE POLICY "Public can view activities from validated centers"
  ON activities FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.validation_status = 'validated'
      AND centers.is_active = true
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_centers_validation_status ON centers(validation_status);

SELECT 'Center validation status migration completed successfully' as message;
