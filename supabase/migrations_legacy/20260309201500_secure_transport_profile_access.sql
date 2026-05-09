-- Tighten transport profile access:
-- 1. Drivers are no longer publicly readable from public.users.
-- 2. Vehicles are no longer publicly readable.
-- Sensitive trip context should be fetched via Edge Functions.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view provider or driver profiles" ON public.users;
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated can view provider profiles" ON public.users;

CREATE POLICY "Authenticated can view provider profiles"
ON public.users
FOR SELECT
TO authenticated
USING (role = 'provider');

DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Trip participants read assigned driver vehicle" ON public.vehicles;

CREATE POLICY "Trip participants read assigned driver vehicle"
ON public.vehicles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    JOIN public.trips t ON t.driver_id = vehicles.driver_id
    WHERE me.supabase_uid = auth.uid()
      AND (
        t.client_id = me.id
        OR t.driver_id = me.id
      )
      AND t.status IN ('accepted', 'arrived', 'in_progress', 'completed')
  )
);
