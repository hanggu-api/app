-- Migration: 20260224270000_robust_registration_fix.sql
-- Purpose: Consolidate role defaults, trigger fixes, and RLS policies for a seamless registration flow.

-- 1. Table Schema Refinement
DO $$ 
BEGIN
    -- Update existing NULL roles
    UPDATE public.users 
    SET role = CASE 
        WHEN EXISTS (SELECT 1 FROM public.providers WHERE user_id = public.users.id) THEN 'provider' 
        ELSE 'client' 
    END 
    WHERE role IS NULL;

    -- Set Default and Not Null
    ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'client';
    ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Note: Schema update might have partially run already.';
END $$;

-- 2. Trigger Function Update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, email, full_name, role, created_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    NOW()
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Consolidated RLS Policies
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

-- Policies for providers and professions
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view providers" ON public.providers;
CREATE POLICY "Public can view providers" ON public.providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Providers can manage own data" ON public.providers;
CREATE POLICY "Providers can manage own data" ON public.providers FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = user_id))
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = user_id));

ALTER TABLE public.provider_professions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Providers can manage own professions" ON public.provider_professions;
CREATE POLICY "Providers can manage own professions" ON public.provider_professions FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id))
WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id));
