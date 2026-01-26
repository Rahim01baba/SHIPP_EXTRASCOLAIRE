/*
  # Create Storage Bucket for Children Photos

  ## Purpose
  Create a Supabase Storage bucket to store children profile photos.
  Photos are linked to children profiles via photo_url column.

  ## Changes
  1. Create 'children-photos' storage bucket
  2. Set up RLS policies for bucket access:
     - Parents can upload/update/delete photos for their own children
     - Admins can manage all photos
     - Everyone can view photos (public read access)

  ## Security
  - Parents: Can only manage photos for their own children
  - Admins: Full access to all photos
  - Public: Read-only access for displaying photos
*/

-- Create storage bucket for children photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('children-photos', 'children-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Parents can upload photos for their own children
CREATE POLICY "Parents can upload own children photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'children-photos'
  AND auth.uid() IN (
    SELECT parent_id
    FROM children
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Parents can update photos for their own children
CREATE POLICY "Parents can update own children photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'children-photos'
  AND auth.uid() IN (
    SELECT parent_id
    FROM children
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Parents can delete photos for their own children
CREATE POLICY "Parents can delete own children photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'children-photos'
  AND auth.uid() IN (
    SELECT parent_id
    FROM children
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Policy: Admins can manage all children photos
CREATE POLICY "Admins can manage all children photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'children-photos'
  AND is_admin()
);

-- Policy: Public read access for displaying photos
CREATE POLICY "Public can view children photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'children-photos');
