-- Allow chat participants to mark messages as read.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can update read_at" ON public.chat_messages;
CREATE POLICY "Chat participants can update read_at"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id::text = chat_messages.service_id
        AND auth.uid() IS NOT NULL
        AND (
          t.client_id IN (
            SELECT u.id FROM public.users u WHERE u.supabase_uid = auth.uid()
          )
          OR t.driver_id IN (
            SELECT u.id FROM public.users u WHERE u.supabase_uid = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.service_requests_new s
      WHERE s.id::text = chat_messages.service_id
        AND auth.uid() IS NOT NULL
        AND (
          s.client_id IN (
            SELECT u.id FROM public.users u WHERE u.supabase_uid = auth.uid()
          )
          OR s.provider_id IN (
            SELECT u.id FROM public.users u WHERE u.supabase_uid = auth.uid()
          )
        )
    )
  )
)
WITH CHECK (
  read_at IS NOT NULL
);
