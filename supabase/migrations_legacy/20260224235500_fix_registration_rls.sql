-- Migration: 20260224260000_fix_registration_rls.sql
-- Purpose: Allow users to manage their own profiles and registrations via RLS policies.

-- 1) public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT
USING (auth.uid() = supabase_uid);

DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;
CREATE POLICY "Public can view provider profiles" ON public.users FOR SELECT
USING (role = 'provider');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE
USING (auth.uid() = supabase_uid)
WITH CHECK (auth.uid() = supabase_uid);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT
WITH CHECK (auth.uid() = supabase_uid);

-- 2) public.providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own provider data" ON public.providers;
CREATE POLICY "Users can view own provider data" ON public.providers FOR SELECT
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Public can view providers" ON public.providers;
CREATE POLICY "Public can view providers" ON public.providers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Providers can manage own data" ON public.providers;
CREATE POLICY "Providers can manage own data" ON public.providers FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = user_id))
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = user_id));

-- 3) public.provider_professions
ALTER TABLE public.provider_professions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can manage own professions" ON public.provider_professions;
CREATE POLICY "Providers can manage own professions" ON public.provider_professions FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id))
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id));

-- 4) public.vehicles (already has policies in 20260224230000_uber_vehicle_table.sql, but ensuring here too)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can manage own vehicles" ON public.vehicles;
CREATE POLICY "Drivers can manage own vehicles" ON public.vehicles FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id))
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id));
