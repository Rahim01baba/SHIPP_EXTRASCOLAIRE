/*
  # Create Automatic Center Creation Trigger

  ## Problem
  - Centers are creating profiles but not creating entries in the centers table
  - Found 2 center profiles without corresponding centers entries
  - This causes centers to be invisible in admin interface

  ## Solution
  - Create a trigger that automatically creates a centers entry when a profile with role='center' is created
  - Add unique constraint on owner_profile_id to prevent duplicates
  - This ensures centers are always visible in admin interface for validation

  ## Changes
  1. Add unique constraint on centers.owner_profile_id
  2. Create function to automatically create center entry
  3. Create trigger on profiles table to call this function
  4. Backfill missing centers for existing profiles
*/

-- 1) Add unique constraint to prevent duplicate centers for same profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centers_owner_unique'
  ) THEN
    ALTER TABLE public.centers
    ADD CONSTRAINT centers_owner_unique UNIQUE (owner_profile_id);
  END IF;
END $$;

-- 2) Create function to automatically create center entry
CREATE OR REPLACE FUNCTION public.ensure_center_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'center' THEN
    INSERT INTO public.centers (
      name,
      email,
      phone,
      address_text,
      owner_profile_id,
      status,
      is_active,
      shipp_commission_pct
    )
    VALUES (
      COALESCE(NEW.full_name, 'Nouveau centre'),
      NEW.email,
      COALESCE(NEW.phone, ''),
      COALESCE(NEW.address, ''),
      NEW.id,
      'pending',
      false,
      10.00
    )
    ON CONFLICT (owner_profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_profiles_ensure_center ON public.profiles;

CREATE TRIGGER trg_profiles_ensure_center
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_center_row();

-- 4) Backfill missing centers for existing profiles
INSERT INTO public.centers (
  name,
  email,
  phone,
  address_text,
  owner_profile_id,
  status,
  is_active,
  shipp_commission_pct
)
SELECT
  COALESCE(p.full_name, 'Nouveau centre') as name,
  p.email,
  COALESCE(p.phone, '') as phone,
  COALESCE(p.address, '') as address_text,
  p.id as owner_profile_id,
  'pending' as status,
  false as is_active,
  10.00 as shipp_commission_pct
FROM public.profiles p
LEFT JOIN public.centers c ON c.owner_profile_id = p.id
WHERE p.role = 'center'
  AND c.id IS NULL
ON CONFLICT (owner_profile_id) DO NOTHING;
