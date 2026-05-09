-- Migration to fix Storage policies for chat media
-- Ensures users can upload and read chat attachments without legacy dependencies.

-- 1. Ensure the bucket exists and is public (optional but common for chat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing restrictive policies for chat_media to avoid conflicts
DROP POLICY IF EXISTS "Chat Media Read" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Insert" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Update" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- 3. Create clean policies for chat_media bucket
-- Allow public read access (since bucket is public, this is backup or for specific RLS)
CREATE POLICY "Chat Media Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat_media');

-- Allow any authenticated user to upload media
CREATE POLICY "Chat Media Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_media');

-- Allow users to manage their own uploads (optional)
CREATE POLICY "Chat Media Authenticated Manage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'chat_media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Note: The path structure usually is chat_media/service_id/filename
-- We keep it simple to restore functionality immediately.
