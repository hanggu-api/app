-- Allow providers to view unassigned services that are available for dispatch.
-- Without this, RLS only lets participants (client/provider) read rows, so provider apps see empty "Disponíveis".

ALTER TABLE IF EXISTS public.service_requests_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view available services" ON public.service_requests_new;
CREATE POLICY "Providers can view available services"
ON public.service_requests_new
FOR SELECT
USING (
  -- Already participant (client/provider)
  auth.uid() IN (
    SELECT supabase_uid FROM public.users WHERE id = client_id OR id = provider_id
  )
  OR
  (
    -- Provider viewing marketplace of jobs (unassigned)
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.supabase_uid = auth.uid()
        AND u.role = 'provider'
    )
    AND provider_id IS NULL
    AND status IN ('pending', 'open_for_schedule', 'searching')
    AND (
      profession_id IS NULL
      OR profession_id IN (
        SELECT pp.profession_id
        FROM public.provider_professions pp
        JOIN public.users u2 ON u2.id = pp.provider_user_id
        WHERE u2.supabase_uid = auth.uid()
      )
    )
  )
);

