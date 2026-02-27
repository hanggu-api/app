-- Migration: 20260224120000_add_rls_patches.sql
-- Purpose: Add/repair Row Level Security policies that the Flutter app
-- expects at runtime. These are safe DROP/CREATE statements intended
-- to be applied once on the remote Supabase DB.

-- 1) service_requests_new: allow owners (client/provider) to SELECT/INSERT/UPDATE
ALTER TABLE IF EXISTS public.service_requests_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own service_requests" ON public.service_requests_new;
CREATE POLICY "Users can view own service_requests" ON public.service_requests_new FOR SELECT
USING (
  auth.uid() IN (
    SELECT supabase_uid FROM public.users WHERE id = client_id OR id = provider_id
  )
);

DROP POLICY IF EXISTS "Users can insert service_requests" ON public.service_requests_new;
CREATE POLICY "Users can insert service_requests" ON public.service_requests_new FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = client_id)
);

DROP POLICY IF EXISTS "Users can update own service_requests" ON public.service_requests_new;
CREATE POLICY "Users can update own service_requests" ON public.service_requests_new FOR UPDATE
USING (
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = client_id OR id = provider_id)
)
WITH CHECK (
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = client_id OR id = provider_id)
);

DROP POLICY IF EXISTS "Service role full access service_requests" ON public.service_requests_new;
CREATE POLICY "Service role full access service_requests" ON public.service_requests_new FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) appointments: allow clients to insert (book) and participants to update
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
CREATE POLICY "Users can insert appointments" ON public.appointments FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = client_id)
);

DROP POLICY IF EXISTS "Providers can update appointments" ON public.appointments;
CREATE POLICY "Providers can update appointments" ON public.appointments FOR UPDATE
USING (
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id)
)
WITH CHECK (
  -- allow updates from provider or client (e.g. confirm/cancel)
  auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id)
  OR auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = client_id)
);

-- 3) service_location_history: restrict read to participants of the related service
ALTER TABLE IF EXISTS public.service_location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Limit location select to participants" ON public.service_location_history;
CREATE POLICY "Limit location select to participants" ON public.service_location_history FOR SELECT
USING (
  auth.uid() IN (
    SELECT supabase_uid FROM public.users
    WHERE id = (
      SELECT client_id FROM public.service_requests_new WHERE id = service_id
    ) OR id = (
      SELECT provider_id FROM public.service_requests_new WHERE id = service_id
    )
  )
);

-- 4) Ensure payments can be managed by service_role and read by related users
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver seus próprios pagamentos" ON public.payments;
CREATE POLICY "Usuário pode ver seus próprios pagamentos" ON public.payments FOR SELECT
USING (
  service_id IN (
    SELECT id FROM public.service_requests_new
    WHERE client_id::text = auth.uid()::text OR provider_id::text = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Service role pode gerenciar pagamentos" ON public.payments;
CREATE POLICY "Service role pode gerenciar pagamentos" ON public.payments FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- End of migration
-- Note: storage.objects policies are already defined in earlier migrations.
-- If you need to add/modify them, use Supabase Dashboard → Storage → Policies.
