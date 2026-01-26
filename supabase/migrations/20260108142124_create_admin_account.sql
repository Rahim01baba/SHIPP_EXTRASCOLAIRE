/*
  # Create Admin Account
  
  1. Creates admin user in auth.users
    - Email: admin@shipp.com
    - Password: Baba1234 (BCrypt hashed)
    - Email confirmed immediately
  
  2. Creates corresponding profile
    - Role: admin
    - Full access to all admin features
  
  3. Security
    - Password properly hashed with BCrypt
    - Email confirmation set for immediate login
    - Profile created with admin role
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate UUID for admin user
  admin_user_id := gen_random_uuid();
  
  -- Check if admin user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@shipp.com'
  ) THEN
    -- Insert admin user into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@shipp.com',
      crypt('Baba1234', gen_salt('bf')),
      NOW(),
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrateur SHIPP"}',
      false,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      '',
      '',
      ''
    );
    
    -- Create corresponding profile with admin role
    INSERT INTO public.profiles (
      id,
      role,
      full_name,
      email,
      phone,
      address,
      zone_id,
      center_id,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'admin',
      'Administrateur SHIPP',
      'admin@shipp.com',
      '+2250101723687',
      'Cocody Vallon, Rue J79, Abidjan',
      NULL,
      NULL,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Admin account created successfully: admin@shipp.com / Baba1234';
  ELSE
    RAISE NOTICE 'Admin account already exists';
  END IF;
END $$;

SELECT 'Admin account setup complete' as message;