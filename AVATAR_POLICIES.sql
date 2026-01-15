-- Supabase Storage Policies for Avatars Bucket
-- Run this in Supabase SQL Editor after creating the 'avatars' bucket

-- First, make sure the bucket exists and is public:
-- 1. Go to Storage → New bucket
-- 2. Name: avatars
-- 3. Public: Yes
-- 4. Create bucket

-- Then run these policies:

-- Allow authenticated users to upload to their own folder only
-- Files are stored as: avatars/{userId}/{filename}
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone (including anonymous) to view avatars (public bucket)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
