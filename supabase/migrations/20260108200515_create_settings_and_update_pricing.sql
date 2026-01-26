/*
  # Create Settings Table and Update Pricing Structure

  ## Purpose
  Add comprehensive pricing management:
  - Create settings table for global configuration
  - Add pricing fields to activities
  - Add logo support for centers
  - Create storage bucket for center logos

  ## Changes
  1. Create settings table with key-value structure
  2. Insert default transport price setting
  3. Add use_global_transport to activities
  4. Add notes_admin field to centers
  5. Create center-logos storage bucket
  6. Add RLS policies for settings

  ## Security
  - Only admins can manage settings
  - Only admins can upload center logos
  - Parents can read validated centers only
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Insert default transport price
INSERT INTO settings (key, value, description)
VALUES ('transport_price_default', 30000, 'Tarif transport global par défaut (FCFA)')
ON CONFLICT (key) DO NOTHING;

-- Add use_global_transport to activities if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'use_global_transport'
  ) THEN
    ALTER TABLE activities ADD COLUMN use_global_transport boolean DEFAULT false;
  END IF;
END $$;

-- Add notes_admin to centers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'notes_admin'
  ) THEN
    ALTER TABLE centers ADD COLUMN notes_admin text;
  END IF;
END $$;

-- Add logo_url to centers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE centers ADD COLUMN logo_url text;
  END IF;
END $$;

-- Enable RLS on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create storage bucket for center logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('center-logos', 'center-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for center logos
CREATE POLICY "Admins can upload center logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'center-logos' AND
    is_admin()
  );

CREATE POLICY "Admins can update center logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'center-logos' AND is_admin())
  WITH CHECK (bucket_id = 'center-logos' AND is_admin());

CREATE POLICY "Admins can delete center logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'center-logos' AND is_admin());

CREATE POLICY "Anyone can view center logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'center-logos');

-- Update centers RLS policies to allow admin editing
DROP POLICY IF EXISTS "Admins can manage all centers" ON centers;

CREATE POLICY "Admins can read all centers"
  ON centers FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update centers"
  ON centers FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert centers"
  ON centers FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Update activities RLS policies
DROP POLICY IF EXISTS "Admins can manage all activities" ON activities;

CREATE POLICY "Admins can read all activities"
  ON activities FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Parents can read validated centers
CREATE POLICY "Parents can read validated centers"
  ON centers FOR SELECT
  TO authenticated
  USING (
    validation_status = 'validated' AND
    is_active = true
  );

-- Parents can read active activities
CREATE POLICY "Parents can read active activities"
  ON activities FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create function to update settings timestamp
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for settings updates
DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();
