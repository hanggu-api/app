-- Fix chat_messages RLS for transport/service chat flows.
-- Current app writes chat messages using:
--   service_id = trip/service UUID (as text)
--   sender_id  = public.users.id (bigint)
--
-- This migration allows only participants of the related trip/service to read/send.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;
CREATE POLICY "Chat participants can read messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.users u ON u.id = t.client_id OR u.id = t.driver_id
    WHERE t.id::text = chat_messages.service_id
      AND u.supabase_uid = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.service_requests_new s
    JOIN public.users u ON u.id = s.client_id OR u.id = s.provider_id
    WHERE s.id::text = chat_messages.service_id
      AND u.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Chat participants can insert messages" ON public.chat_messages;
CREATE POLICY "Chat participants can insert messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- Sender must be the authenticated user in public.users mapping.
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.id = chat_messages.sender_id
      AND me.supabase_uid = auth.uid()
  )
  AND
  (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id::text = chat_messages.service_id
        AND (t.client_id = chat_messages.sender_id OR t.driver_id = chat_messages.sender_id)
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.service_requests_new s
      WHERE s.id::text = chat_messages.service_id
        AND (s.client_id = chat_messages.sender_id OR s.provider_id = chat_messages.sender_id)
    )
  )
);

