/*
  # Recréer le compte administrateur SHIPP
  
  1. Modifications
    - Supprime l'ancien compte admin@shipp.com
    - Crée un nouveau compte admin avec les identifiants :
      * Email: admin@shipp.com
      * Mot de passe: Baba1234
      * Nom complet: Administrateur SHIPP
      * Téléphone: +33 1 23 45 67 89
      * Adresse: 123 Avenue de l'Éducation, 75001 Paris
    
  2. Sécurité
    - Le profil est automatiquement créé avec le rôle 'admin'
    - Accès complet à toutes les fonctionnalités de pilotage
*/

-- Supprimer l'ancien profil et utilisateur s'ils existent
DELETE FROM profiles WHERE email = 'admin@shipp.com';
DELETE FROM auth.users WHERE email = 'admin@shipp.com';

-- Créer le nouvel utilisateur admin dans auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@shipp.com',
  crypt('Baba1234', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrateur SHIPP"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
RETURNING id;

-- Créer le profil admin correspondant
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  phone,
  address,
  created_at,
  updated_at
)
SELECT
  id,
  'admin@shipp.com',
  'Administrateur SHIPP',
  'admin',
  '+33 1 23 45 67 89',
  '123 Avenue de l''Éducation, 75001 Paris',
  now(),
  now()
FROM auth.users
WHERE email = 'admin@shipp.com';
