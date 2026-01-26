/*
  # Activity Types Management System
  
  1. New Tables
    - `activity_types` - Admin-managed list of available activity types
  
  2. Changes
    - Modify centers table to use array of activity type IDs instead of single activity_type
    - Add google_maps_url and coordinates to centers
  
  3. Security
    - Only admins can manage activity types
    - Public can view active activity types
    - Centers select from available types
*/

-- Create activity_types table
CREATE TABLE IF NOT EXISTS activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, name)
);

-- Add new columns to centers table
DO $$
BEGIN
  -- Add activity_type_ids array column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'activity_type_ids'
  ) THEN
    ALTER TABLE centers ADD COLUMN activity_type_ids uuid[] DEFAULT '{}';
  END IF;

  -- Add Google Maps URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'google_maps_url'
  ) THEN
    ALTER TABLE centers ADD COLUMN google_maps_url text;
  END IF;

  -- Add GPS coordinates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE centers ADD COLUMN latitude numeric(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE centers ADD COLUMN longitude numeric(11, 8);
  END IF;
END $$;

-- Enable RLS on activity_types
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_types

-- Anyone can view active activity types
CREATE POLICY "Public can view active activity types"
  ON activity_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all activity types
CREATE POLICY "Admins can view all activity types"
  ON activity_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert activity types
CREATE POLICY "Admins can create activity types"
  ON activity_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update activity types
CREATE POLICY "Admins can update activity types"
  ON activity_types FOR UPDATE
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

-- Admins can delete activity types
CREATE POLICY "Admins can delete activity types"
  ON activity_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert initial activity types
INSERT INTO activity_types (category, name, description, display_order) VALUES
  -- Arts & Création
  ('Arts & Création', 'Peinture', 'Cours de peinture pour tous niveaux', 10),
  ('Arts & Création', 'Dessin', 'Apprentissage du dessin et croquis', 20),
  ('Arts & Création', 'Sculpture', 'Initiation à la sculpture', 30),
  ('Arts & Création', 'Arts plastiques', 'Activités créatives variées', 40),
  ('Arts & Création', 'Calligraphie', 'Art de la belle écriture', 50),
  ('Arts & Création', 'Design graphique', 'Introduction au design numérique', 60),

  -- Musique & Arts de la scène
  ('Musique & Arts de la scène', 'Piano', 'Cours de piano classique et moderne', 110),
  ('Musique & Arts de la scène', 'Guitare', 'Guitare acoustique et électrique', 120),
  ('Musique & Arts de la scène', 'Batterie', 'Apprentissage de la batterie', 130),
  ('Musique & Arts de la scène', 'Violon', 'Cours de violon', 140),
  ('Musique & Arts de la scène', 'Chant', 'Technique vocale et chant', 150),
  ('Musique & Arts de la scène', 'Danse', 'Danse moderne et classique', 160),
  ('Musique & Arts de la scène', 'Théâtre', 'Expression théâtrale', 170),

  -- Sports
  ('Sports', 'Football', 'Entraînement de football', 210),
  ('Sports', 'Basketball', 'Formation basketball', 220),
  ('Sports', 'Natation', 'Cours de natation', 230),
  ('Sports', 'Athlétisme', 'Activités athlétiques', 240),
  ('Sports', 'Arts martiaux', 'Karaté, Judo, Taekwondo', 250),
  ('Sports', 'Gymnastique', 'Gymnastique artistique', 260),
  ('Sports', 'Tennis', 'Cours de tennis', 270),
  ('Sports', 'Fitness enfants', 'Fitness adapté aux enfants', 280),

  -- Sciences & Technologie
  ('Sciences & Technologie', 'Robotique', 'Construction et programmation de robots', 310),
  ('Sciences & Technologie', 'Programmation', 'Initiation au code', 320),
  ('Sciences & Technologie', 'Codage', 'Apprentissage du codage', 330),
  ('Sciences & Technologie', 'Électronique', 'Circuits et composants électroniques', 340),
  ('Sciences & Technologie', 'STEM', 'Science, Technologie, Ingénierie, Mathématiques', 350),
  ('Sciences & Technologie', 'Impression 3D', 'Modélisation et impression 3D', 360),

  -- Aviation & Technique
  ('Aviation & Technique', 'Pilotage d''avion (initiation)', 'Introduction au pilotage', 410),
  ('Aviation & Technique', 'Simulation de vol', 'Simulateur de vol', 420),
  ('Aviation & Technique', 'Drones', 'Pilotage de drones', 430),
  ('Aviation & Technique', 'Aéromodélisme', 'Construction de modèles réduits', 440),

  -- Langues & Culture
  ('Langues & Culture', 'Anglais', 'Cours d''anglais', 510),
  ('Langues & Culture', 'Français', 'Perfectionnement en français', 520),
  ('Langues & Culture', 'Chinois', 'Initiation au chinois mandarin', 530),
  ('Langues & Culture', 'Espagnol', 'Cours d''espagnol', 540),
  ('Langues & Culture', 'Culture générale', 'Enrichissement culturel', 550),

  -- Développement personnel
  ('Développement personnel', 'Échecs', 'Apprentissage du jeu d''échecs', 610),
  ('Développement personnel', 'Lecture guidée', 'Club de lecture pour enfants', 620),
  ('Développement personnel', 'Leadership junior', 'Développement des compétences de leadership', 630),
  ('Développement personnel', 'Prise de parole', 'Art oratoire et communication', 640)
ON CONFLICT (category, name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_types_category ON activity_types(category);
CREATE INDEX IF NOT EXISTS idx_activity_types_active ON activity_types(is_active);
CREATE INDEX IF NOT EXISTS idx_activity_types_order ON activity_types(display_order);
CREATE INDEX IF NOT EXISTS idx_centers_activity_types ON centers USING GIN(activity_type_ids);
CREATE INDEX IF NOT EXISTS idx_centers_location ON centers(latitude, longitude);

SELECT 'Activity types management system created successfully' as message;
