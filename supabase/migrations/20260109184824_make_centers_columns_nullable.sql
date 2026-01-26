/*
  # Make Centers Columns Nullable

  ## Problem
  - The centers table has legacy NOT NULL constraints on columns that are no longer required
  - activity_type, age_min, age_max, max_capacity, address are NOT NULL but shouldn't be
  - These fields are now managed through the activities table instead
  - This prevents creating centers through the signup flow without these legacy fields

  ## Solution
  - Make these legacy columns nullable
  - This allows centers to be created with minimal information
  - Detailed activity information is stored in the activities table

  ## Changes
  1. Make activity_type nullable
  2. Make age_min nullable
  3. Make age_max nullable
  4. Make max_capacity nullable
  5. Make address nullable (we use address_text instead)
*/

-- Make legacy columns nullable
ALTER TABLE centers 
  ALTER COLUMN activity_type DROP NOT NULL,
  ALTER COLUMN age_min DROP NOT NULL,
  ALTER COLUMN age_max DROP NOT NULL,
  ALTER COLUMN max_capacity DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL;
