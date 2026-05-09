-- Allow authenticated apps to insert service_logs for services they participate in.
-- This is needed for client/provider apps to log lightweight UI events (e.g. notification tap).

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

-- INSERT policy
DROP POLICY IF EXISTS "Authenticated can insert own service logs" ON public.service_logs;
CREATE POLICY "Authenticated can insert own service logs"
  ON public.service_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_requests_new sr
      WHERE sr.id = service_logs.service_id
        AND (
          -- UUID-first columns (preferred)
          sr.client_uid = auth.uid()
          OR sr.provider_uid = auth.uid()
          -- Legacy int columns via users mapping
          OR auth.uid() IN (
            SELECT u.supabase_uid
            FROM public.users u
            WHERE u.id IN (sr.client_id, sr.provider_id)
          )
        )
    )
  );

