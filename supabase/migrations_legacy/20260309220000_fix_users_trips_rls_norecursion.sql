-- Fix residual recursion in RLS for users/trips by recreating policies with a
-- helper function evaluated outside RLS.

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Trip or service participants read related profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated can view provider profiles" ON public.users;
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;

CREATE POLICY "Users read own profile"
ON public.users FOR SELECT TO authenticated
USING (supabase_uid = auth.uid());

CREATE POLICY "Users insert own profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (supabase_uid = auth.uid());

CREATE POLICY "Users update own profile"
ON public.users FOR UPDATE TO authenticated
USING (supabase_uid = auth.uid())
WITH CHECK (supabase_uid = auth.uid());

CREATE POLICY "Providers readable"
ON public.users FOR SELECT TO authenticated
USING (role = 'provider');

CREATE POLICY "Participants read related profiles"
ON public.users FOR SELECT TO authenticated
USING (
  users.id = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.trips t
    WHERE (t.client_id = public.current_user_id() OR t.driver_id = public.current_user_id())
      AND (t.client_id = users.id OR t.driver_id = users.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.service_requests_new s
    WHERE (s.client_id = public.current_user_id() OR s.provider_id = public.current_user_id())
      AND (s.client_id = users.id OR s.provider_id = users.id)
  )
);

-- TRIPS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip participants read trips" ON public.trips;
DROP POLICY IF EXISTS "Clients insert own trips" ON public.trips;
DROP POLICY IF EXISTS "Participants update own trips" ON public.trips;
DROP POLICY IF EXISTS "Motoristas podem ver suas viagens" ON public.trips;
DROP POLICY IF EXISTS "Motoristas podem aceitar viagens" ON public.trips;
DROP POLICY IF EXISTS "Clientes podem ver suas viagens" ON public.trips;
DROP POLICY IF EXISTS "Motoristas podem ver viagens atribuídas ou em busca" ON public.trips;
DROP POLICY IF EXISTS "Clientes podem criar viagens" ON public.trips;

CREATE POLICY "Trips select by participant"
ON public.trips FOR SELECT TO authenticated
USING (
  client_id = public.current_user_id()
  OR driver_id = public.current_user_id()
);

CREATE POLICY "Trips insert by client"
ON public.trips FOR INSERT TO authenticated
WITH CHECK (client_id = public.current_user_id());

CREATE POLICY "Trips update by participant"
ON public.trips FOR UPDATE TO authenticated
USING (
  client_id = public.current_user_id()
  OR driver_id = public.current_user_id()
)
WITH CHECK (
  client_id = public.current_user_id()
  OR driver_id = public.current_user_id()
);
