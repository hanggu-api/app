-- Migration to fix folder index in chat media storage policies
-- The path includes a 'chat_media' subfolder, so service_id is at index 2.

DROP POLICY IF EXISTS "Chat Media Participant Read" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Participant Upload" ON storage.objects;

CREATE POLICY "Chat Media Participant Read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_media' 
  AND (
    (storage.foldername(name))[1] = 'chat_media' AND EXISTS (
      SELECT 1 FROM public.service_chat_participants
      WHERE service_id = (storage.foldername(name))[2]
      AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.service_chat_participants
      WHERE service_id = (storage.foldername(name))[1]
      AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
  )
);

CREATE POLICY "Chat Media Participant Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_media'
  AND (
    (storage.foldername(name))[1] = 'chat_media' AND EXISTS (
      SELECT 1 FROM public.service_chat_participants
      WHERE service_id = (storage.foldername(name))[2]
      AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.service_chat_participants
      WHERE service_id = (storage.foldername(name))[1]
      AND user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())
    )
  )
);
