/*
  # Add status column to centers table

  ## Problem
  - Centers table is missing the `status` column
  - CenterSignup tries to INSERT with `status: 'pending'` but fails
  - CentersPage filters on `status` but column doesn't exist

  ## Solution
  1. Add `status` column with type enum (pending, approved, rejected, suspended)
  2. Add related columns (approved_at, approved_by, rejected_reason)
  3. Set default value to 'pending'
  4. Migrate existing data: is_active=true → status='approved', is_active=false → status='pending'
*/

-- Create enum for center status
DO $$ BEGIN
  CREATE TYPE center_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'status'
  ) THEN
    ALTER TABLE centers ADD COLUMN status center_status DEFAULT 'pending' NOT NULL;
  END IF;
END $$;

-- Add related columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE centers ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE centers ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'rejected_reason'
  ) THEN
    ALTER TABLE centers ADD COLUMN rejected_reason text;
  END IF;
END $$;

-- Migrate existing data
UPDATE centers
SET status = CASE
  WHEN is_active = true THEN 'approved'::center_status
  ELSE 'pending'::center_status
END
WHERE status = 'pending';

-- Add email and phone columns if they don't exist (needed for CenterSignup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'email'
  ) THEN
    ALTER TABLE centers ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE centers ADD COLUMN phone text;
  END IF;
END $$;

-- Add address_text and google_maps_link columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'address_text'
  ) THEN
    ALTER TABLE centers ADD COLUMN address_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'google_maps_link'
  ) THEN
    ALTER TABLE centers ADD COLUMN google_maps_link text;
  END IF;
END $$;

-- Add owner_profile_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'owner_profile_id'
  ) THEN
    ALTER TABLE centers ADD COLUMN owner_profile_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add notes_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'notes_admin'
  ) THEN
    ALTER TABLE centers ADD COLUMN notes_admin text;
  END IF;
END $$;

SELECT 'Centers status column added successfully' as message;
