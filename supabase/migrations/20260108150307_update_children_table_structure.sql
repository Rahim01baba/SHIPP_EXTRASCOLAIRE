/*
  # Update Children Table Structure

  1. Changes
    - Add `first_name`, `last_name` columns
    - Add `gender` column (M/F)
    - Add `emergency_contact_name`, `emergency_contact_phone` columns
    - Add `transport_authorization` column (boolean, obligatoire)
    - Add `photo_url` column (optional)
    - Rename `date_of_birth` to `birth_date` for consistency
    - Rename `medical_info` to `medical_notes`
    - Drop `full_name` column (replaced by first_name + last_name)
    - Drop `age` column (will be calculated dynamically)
    - Drop `zone_id` column (not needed per business requirements)
    - Drop `emergency_contact` column (replaced by name + phone)

  2. Data Migration
    - Split existing `full_name` into `first_name` and `last_name`
    - Migrate `emergency_contact` to `emergency_contact_name`
    - Set default values for new required fields

  3. Security
    - RLS policies already exist and will continue to work
*/

-- Step 1: Add new columns
DO $$
BEGIN
  -- Add first_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE children ADD COLUMN first_name text;
  END IF;

  -- Add last_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE children ADD COLUMN last_name text;
  END IF;

  -- Add birth_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE children ADD COLUMN birth_date date;
  END IF;

  -- Add gender if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'gender'
  ) THEN
    ALTER TABLE children ADD COLUMN gender text CHECK (gender IN ('M', 'F'));
  END IF;

  -- Add emergency_contact_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'emergency_contact_name'
  ) THEN
    ALTER TABLE children ADD COLUMN emergency_contact_name text;
  END IF;

  -- Add emergency_contact_phone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'emergency_contact_phone'
  ) THEN
    ALTER TABLE children ADD COLUMN emergency_contact_phone text;
  END IF;

  -- Add transport_authorization if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'transport_authorization'
  ) THEN
    ALTER TABLE children ADD COLUMN transport_authorization boolean DEFAULT true;
  END IF;

  -- Add photo_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE children ADD COLUMN photo_url text;
  END IF;

  -- Add medical_notes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'children' AND column_name = 'medical_notes'
  ) THEN
    ALTER TABLE children ADD COLUMN medical_notes text;
  END IF;
END $$;

-- Step 2: Migrate existing data
UPDATE children
SET
  first_name = COALESCE(split_part(full_name, ' ', 1), 'Prénom'),
  last_name = COALESCE(nullif(substring(full_name from position(' ' in full_name) + 1), ''), 'Nom'),
  birth_date = date_of_birth,
  gender = 'M',
  emergency_contact_name = COALESCE(emergency_contact, 'À définir'),
  emergency_contact_phone = '+243000000000',
  transport_authorization = true,
  medical_notes = medical_info
WHERE first_name IS NULL;

-- Step 3: Make new columns NOT NULL after migration
ALTER TABLE children ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE children ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE children ALTER COLUMN birth_date SET NOT NULL;
ALTER TABLE children ALTER COLUMN gender SET NOT NULL;
ALTER TABLE children ALTER COLUMN emergency_contact_name SET NOT NULL;
ALTER TABLE children ALTER COLUMN emergency_contact_phone SET NOT NULL;
ALTER TABLE children ALTER COLUMN transport_authorization SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE children DROP COLUMN IF EXISTS full_name;
ALTER TABLE children DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE children DROP COLUMN IF EXISTS age;
ALTER TABLE children DROP COLUMN IF EXISTS zone_id;
ALTER TABLE children DROP COLUMN IF EXISTS emergency_contact;
ALTER TABLE children DROP COLUMN IF EXISTS medical_info;

SELECT 'Children table structure updated successfully' as message;