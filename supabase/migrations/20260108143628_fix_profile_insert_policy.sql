/*
  # Fix Profile INSERT Policy
  
  1. Changes
    - Add INSERT policy to allow users to create their own profile
    - This fixes the issue where users with missing profiles cannot login
  
  2. Security
    - Users can only insert their own profile (id must match auth.uid())
    - Prevents users from creating profiles for other users
*/

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

SELECT 'Profile INSERT policy added successfully' as message;