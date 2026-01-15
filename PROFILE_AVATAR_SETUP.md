# Profile Avatar Setup Guide

## Database Migration

Add the `avatar_url` column to the `profiles` table in Supabase:

```sql
-- Add avatar_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Optional: Add comment
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture stored in Supabase Storage';
```

## Supabase Storage Setup

1. **Create Storage Bucket**:
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `avatars`
   - Public bucket: **Yes** (so images can be accessed via public URL)
   - Click "Create bucket"

2. **Set Storage Policies**:
   - Go to Storage → Policies for `avatars` bucket
   - **IMPORTANT**: Make sure RLS is enabled on the bucket (it should be by default)
   - The code uses `{userId}/{filename}` format for better security
   - Add the following policies:

```sql
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
```

**Alternative (Simpler but Less Secure)**: If you want to allow any authenticated user to upload anywhere in the bucket:

```sql
-- Simpler: Allow any authenticated user to upload/update/delete any file
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Note**: If using the simpler version, you'll need to update the upload code to use just the filename (not `{userId}/{filename}`).

## Testing

After setup:
1. Go to Profile page
2. Hover over the avatar circle
3. Click the camera icon to upload an image
4. The image should appear immediately
5. Click the X icon to remove the avatar

## Troubleshooting

- **Upload fails**: Check storage bucket exists and policies are set correctly
- **Image doesn't show**: Check bucket is public and policies allow SELECT
- **Permission denied**: Verify RLS policies allow authenticated users to INSERT/UPDATE/DELETE
