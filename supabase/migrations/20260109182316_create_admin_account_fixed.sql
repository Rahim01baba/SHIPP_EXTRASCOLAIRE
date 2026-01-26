/*
  # Create Complete Admin Account (Fixed)

  ## Problem
  - Admin account does not exist in auth.users or profiles
  - Users cannot login as admin
  - Application shows infinite loading or "profile not found" error

  ## Solution
  - Create admin user in auth.users with secure password
  - Create corresponding profile in profiles table with admin role
  - Admin credentials: admin@shipp-edu.com / Admin2026!

  ## Security
  - Strong password required
  - Admin role properly set
  - Full profile data provided
*/

-- Create admin user in auth.users
DO $$
DECLARE
  admin_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'admin@shipp-edu.com';

  IF existing_user_id IS NOT NULL THEN
    -- User exists, update password
    admin_user_id := existing_user_id;
    
    UPDATE auth.users
    SET
      encrypted_password = crypt('Admin2026!', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin user already exists, password updated';
  ELSE
    -- Create new user
    admin_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@shipp-edu.com',
      crypt('Admin2026!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrateur SHIPP","role":"admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Admin user created with id: %', admin_user_id;
  END IF;

  -- Insert or update profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    phone,
    role,
    address,
    zone_id,
    center_id
  ) VALUES (
    admin_user_id,
    'admin@shipp-edu.com',
    'Administrateur SHIPP',
    '+225 01 01 72 36 87',
    'admin',
    'Abidjan, Cocody Vallon',
    NULL,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    email = 'admin@shipp-edu.com',
    full_name = 'Administrateur SHIPP',
    phone = '+225 01 01 72 36 87';

  RAISE NOTICE 'Admin profile created/updated successfully';
END $$;

SELECT 'Admin account setup complete. Login: admin@shipp-edu.com / Admin2026!' as message;
