-- Migration to refine Chat Media Storage Policies
-- Allows participants of a service to upload/read files in the service folder.

-- 1. Grant usage to storage schema for our helper (often already there)
GRANT USAGE ON SCHEMA storage TO postgres, authenticated, anon;

-- 2. Drop the overly simple policies we created before
DROP POLICY IF EXISTS "Chat Media Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Authenticated Manage" ON storage.objects;

-- 3. Create a more robust policy for Chat Media
-- Path format: chat_media/service_id/filename

-- SELECT: Anyone can read if the bucket is public, but we reinforce it.
CREATE POLICY "Chat Media Participant Read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_media' 
  AND EXISTS (
    SELECT 1 FROM public.service_chat_participants
    WHERE service_id = (storage.foldername(name))[2]
    AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
  )
);

-- INSERT: Only participants can upload to their service folder
CREATE POLICY "Chat Media Participant Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_media'
  AND EXISTS (
    SELECT 1 FROM public.service_chat_participants
    WHERE service_id = (storage.foldername(name))[2]
    AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
  )
);

-- Allow public read if the bucket is public (backup)
CREATE POLICY "Chat Media Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat_media');
