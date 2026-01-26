/*
  # Reset All Account Passwords

  ## Problem
  - Users cannot login with existing accounts
  - Passwords are unknown or not set correctly

  ## Solution
  - Reset passwords for all existing accounts to known values
  - Update admin accounts: Admin2026!
  - Update center accounts: Center2026!

  ## Accounts Updated
  - admin@shipp-edu.com -> Admin2026!
  - admin@shipp.com -> Admin2026!
  - cocan@gmail.com -> Center2026!
  - comos@gmail.com -> Center2026!
*/

-- Reset admin@shipp-edu.com password
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin2026!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'admin@shipp-edu.com';

-- Reset admin@shipp.com password
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin2026!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'admin@shipp.com';

-- Reset cocan@gmail.com password
UPDATE auth.users
SET 
  encrypted_password = crypt('Center2026!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'cocan@gmail.com';

-- Reset comos@gmail.com password
UPDATE auth.users
SET 
  encrypted_password = crypt('Center2026!', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'comos@gmail.com';

-- Display updated accounts
SELECT 
  'Passwords reset successfully' as message,
  email,
  CASE 
    WHEN email LIKE 'admin%' THEN 'Admin2026!'
    ELSE 'Center2026!'
  END as new_password
FROM auth.users
WHERE email IN ('admin@shipp-edu.com', 'admin@shipp.com', 'cocan@gmail.com', 'comos@gmail.com')
ORDER BY email;
