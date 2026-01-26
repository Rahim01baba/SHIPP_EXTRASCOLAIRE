/*
  # Insérer un token d'accès admin permanent
  
  1. Modifications
    - Insère un token d'accès pour le compte admin
    - Token: 63aee7c559743f1605eac8f5f103c0291c54123d4aab5bbf444504263730b478
    - Expire dans 1 an
    - Permet l'accès direct à l'interface admin sans authentification
  
  2. Notes
    - Ce token est associé au compte admin@shipp.com
    - Peut être utilisé via l'URL: http://localhost:5173/?token=XXXX
*/

-- Insérer le token d'accès admin
INSERT INTO admin_access_tokens (
  token,
  user_id,
  expires_at,
  is_active,
  created_at
)
SELECT
  '63aee7c559743f1605eac8f5f103c0291c54123d4aab5bbf444504263730b478',
  u.id,
  now() + interval '1 year',
  true,
  now()
FROM auth.users u
WHERE u.email = 'admin@shipp.com'
ON CONFLICT (token) DO NOTHING;