ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_locations_all" ON public.driver_locations;
DROP POLICY IF EXISTS "Leitura pública de localizações" ON public.driver_locations;
DROP POLICY IF EXISTS "Motoristas atualizam sua própria localização" ON public.driver_locations;

CREATE POLICY "Drivers manage own realtime location"
ON public.driver_locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.id = driver_locations.driver_id
      AND me.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.id = driver_locations.driver_id
      AND me.supabase_uid = auth.uid()
  )
);

CREATE POLICY "Trip participants read realtime location"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    JOIN public.trips t ON t.driver_id = driver_locations.driver_id
    WHERE me.supabase_uid = auth.uid()
      AND (
        t.client_id = me.id
        OR t.driver_id = me.id
      )
      AND t.status IN ('accepted', 'arrived', 'in_progress')
  )
);

DROP POLICY IF EXISTS "Motoristas podem ver viagens atribuídas ou em busca" ON public.trips;
DROP POLICY IF EXISTS "Motoristas podem aceitar viagens" ON public.trips;
DROP POLICY IF EXISTS "Clientes podem ver suas viagens" ON public.trips;
DROP POLICY IF EXISTS "Motoristas podem ver suas viagens" ON public.trips;
DROP POLICY IF EXISTS "Clientes podem criar viagens" ON public.trips;

CREATE POLICY "Trip participants read trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND (
        trips.client_id = me.id
        OR trips.driver_id = me.id
      )
  )
);

CREATE POLICY "Clients insert own trips"
ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND me.id = trips.client_id
      AND me.role = 'client'
  )
);

CREATE POLICY "Participants update own trips"
ON public.trips
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND (
        trips.client_id = me.id
        OR trips.driver_id = me.id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND (
        trips.client_id = me.id
        OR trips.driver_id = me.id
      )
  )
);

DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users read own profile"
ON public.users
FOR SELECT
TO authenticated
USING (supabase_uid = auth.uid());

CREATE POLICY "Users insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (supabase_uid = auth.uid());

CREATE POLICY "Users update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (supabase_uid = auth.uid())
WITH CHECK (supabase_uid = auth.uid());

CREATE POLICY "Trip or service participants read related profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.supabase_uid = auth.uid()
      AND me.id <> users.id
      AND (
        EXISTS (
          SELECT 1
          FROM public.trips t
          WHERE (t.client_id = me.id OR t.driver_id = me.id)
            AND (t.client_id = users.id OR t.driver_id = users.id)
        )
        OR EXISTS (
          SELECT 1
          FROM public.service_requests_new s
          WHERE (s.client_id = me.id OR s.provider_id = me.id)
            AND (s.client_id = users.id OR s.provider_id = users.id)
        )
      )
  )
);

CREATE POLICY "Public can view provider or driver profiles"
ON public.users
FOR SELECT
TO authenticated
USING (role IN ('provider', 'driver'));
