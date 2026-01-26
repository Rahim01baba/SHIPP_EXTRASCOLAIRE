/*
  # Créer système de tokens d'accès admin
  
  1. Nouvelle table
    - `admin_access_tokens`
      - `id` (uuid, primary key)
      - `token` (text, unique) - Token d'accès unique
      - `user_id` (uuid) - Référence à l'utilisateur
      - `expires_at` (timestamptz) - Date d'expiration
      - `is_active` (boolean) - Statut du token
      - `created_at` (timestamptz)
      - `last_used_at` (timestamptz) - Dernière utilisation
  
  2. Sécurité
    - Enable RLS sur la table
    - Seuls les admins peuvent créer des tokens
    - Les tokens peuvent être utilisés pour vérifier l'accès
*/

CREATE TABLE IF NOT EXISTS admin_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE admin_access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre aux admins de créer des tokens
CREATE POLICY "Admins can create tokens"
  ON admin_access_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy pour permettre aux admins de voir leurs tokens
CREATE POLICY "Admins can view own tokens"
  ON admin_access_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy pour permettre la vérification des tokens (accès public pour validation)
CREATE POLICY "Anyone can verify active tokens"
  ON admin_access_tokens
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > now());

-- Policy pour permettre la mise à jour de last_used_at
CREATE POLICY "Update token last used"
  ON admin_access_tokens
  FOR UPDATE
  TO anon
  USING (is_active = true AND expires_at > now())
  WITH CHECK (is_active = true AND expires_at > now());

-- Créer un index sur le token pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_admin_access_tokens_token ON admin_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_access_tokens_active ON admin_access_tokens(is_active, expires_at);
