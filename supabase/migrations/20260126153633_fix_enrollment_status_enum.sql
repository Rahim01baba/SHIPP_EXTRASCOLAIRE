/*
  # Fix Enrollment Status Enum

  ## Problem
  - The enrollment_status enum only has: pending, confirmed, cancelled
  - The application code uses: pending_admin_validation, active
  - This causes enrollments created by parents to fail to appear in admin interface

  ## Solution
  - Add missing enum values to enrollment_status type
  - Add 'pending_admin_validation' for enrollments awaiting admin approval
  - Add 'active' for approved/confirmed enrollments
  - Add 'rejected' for rejected enrollments

  ## Changes
  1. Add 'pending_admin_validation' to enrollment_status enum
  2. Add 'active' to enrollment_status enum
  3. Add 'rejected' to enrollment_status enum

  ## Security
  - No RLS changes required
  - Existing policies remain intact
*/

-- Add new values to enrollment_status enum
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pending_admin_validation';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'rejected';
