-- Permitir que participantes do serviço/corrida leiam e insiram logs de timeline.

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver logs dos seus serviços" ON public.service_logs;
DROP POLICY IF EXISTS "Service role pode inserir logs" ON public.service_logs;
DROP POLICY IF EXISTS "Participants can read service logs" ON public.service_logs;
DROP POLICY IF EXISTS "Participants can insert service logs" ON public.service_logs;

CREATE POLICY "Participants can read service logs"
ON public.service_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.service_requests_new s
          WHERE s.id = service_logs.service_id
            AND (s.client_id = me.id OR s.provider_id = me.id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.trips t
          WHERE t.id::text = service_logs.service_id::text
            AND (t.client_id = me.id OR t.driver_id = me.id)
        )
      )
  )
  OR auth.role() = 'service_role'
);

CREATE POLICY "Participants can insert service logs"
ON public.service_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.service_requests_new s
          WHERE s.id = service_logs.service_id
            AND (s.client_id = me.id OR s.provider_id = me.id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.trips t
          WHERE t.id::text = service_logs.service_id::text
            AND (t.client_id = me.id OR t.driver_id = me.id)
        )
      )
  )
  OR auth.role() = 'service_role'
);
