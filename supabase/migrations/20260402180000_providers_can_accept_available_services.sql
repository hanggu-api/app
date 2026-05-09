-- Allow providers to accept (claim) an unassigned service.
-- Without this UPDATE policy, the provider app may show "Serviço aceito!" but the row is not updated
-- (PostgREST returns 200 with empty body when RLS blocks the UPDATE).

ALTER TABLE IF EXISTS public.service_requests_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can accept available services" ON public.service_requests_new;
CREATE POLICY "Providers can accept available services"
ON public.service_requests_new
FOR UPDATE
USING (
  -- Provider is claiming an unassigned request
  provider_id IS NULL
  AND status IN ('pending', 'open_for_schedule', 'searching')
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.supabase_uid = auth.uid()
      AND u.role = 'provider'
  )
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
WITH CHECK (
  -- Ensure the provider_id being set is the current provider user
  provider_id = (
    SELECT id FROM public.users u
    WHERE u.supabase_uid = auth.uid()
    LIMIT 1
  )
  AND status = 'accepted'
);

