-- Migration to fix Storage access by direct service lookup
-- This bypasses the participants table and checks service tables directly.

DROP POLICY IF EXISTS "Chat Media Participant Read" ON storage.objects;
DROP POLICY IF EXISTS "Chat Media Participant Upload" ON storage.objects;

-- Helper to get the service_id from path regardless of the 'chat_media/' prefix
-- If path is 'chat_media/UUID/file', it returns UUID. If 'UUID/file', returns UUID.
CREATE OR REPLACE FUNCTION public.get_service_id_from_path(name text)
RETURNS text AS $$
BEGIN
  IF (storage.foldername(name))[1] = 'chat_media' THEN
    RETURN (storage.foldername(name))[2];
  ELSE
    RETURN (storage.foldername(name))[1];
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE POLICY "Chat Media Direct Read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_media' 
  AND (
    EXISTS (
      SELECT 1 FROM public.service_requests s
      LEFT JOIN public.users cu ON cu.id = s.client_id
      LEFT JOIN public.users pu ON pu.id = s.provider_id
      WHERE s.id::text = public.get_service_id_from_path(name)
        AND (cu.supabase_uid = auth.uid() OR pu.supabase_uid = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agendamento_servico a
      WHERE a.id::text = public.get_service_id_from_path(name)
        AND (a.cliente_uid = auth.uid() OR a.prestador_uid = auth.uid())
    )
  )
);

CREATE POLICY "Chat Media Direct Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_media'
  AND (
    EXISTS (
      SELECT 1 FROM public.service_requests s
      LEFT JOIN public.users cu ON cu.id = s.client_id
      LEFT JOIN public.users pu ON pu.id = s.provider_id
      WHERE s.id::text = public.get_service_id_from_path(name)
        AND (cu.supabase_uid = auth.uid() OR pu.supabase_uid = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.agendamento_servico a
      WHERE a.id::text = public.get_service_id_from_path(name)
        AND (a.cliente_uid = auth.uid() OR a.prestador_uid = auth.uid())
    )
  )
);
