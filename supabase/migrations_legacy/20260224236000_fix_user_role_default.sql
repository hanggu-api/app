-- Migration: 20260224236000_fix_user_role_default.sql
-- Purpose: Ensure 'role' has a default value and is never NULL.

-- 1. Update existing NULL roles
-- If they are in providers table, they should be 'provider', otherwise 'client'
UPDATE public.users
SET role = CASE 
    WHEN EXISTS (SELECT 1 FROM public.providers WHERE user_id = public.users.id) THEN 'provider'::text
    ELSE 'client'::text
END
WHERE role IS NULL;

-- 2. Add DEFAULT and NOT NULL constraint
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'client';
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- 3. Update the trigger function as a safeguard (though table default handles it)
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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
