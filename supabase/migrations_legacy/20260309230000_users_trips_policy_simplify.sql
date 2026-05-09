-- Temporary simplify policies to stop recursion errors.

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('users','trips')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_self" ON public.users FOR INSERT TO authenticated WITH CHECK (supabase_uid = auth.uid());
CREATE POLICY "users_update_self" ON public.users FOR UPDATE TO authenticated USING (supabase_uid = auth.uid()) WITH CHECK (supabase_uid = auth.uid());

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_select_all" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "trips_insert_client" ON public.trips FOR INSERT TO authenticated WITH CHECK (client_id = public.current_user_id());
CREATE POLICY "trips_update_participant" ON public.trips FOR UPDATE TO authenticated USING (client_id = public.current_user_id() OR driver_id = public.current_user_id()) WITH CHECK (client_id = public.current_user_id() OR driver_id = public.current_user_id());
