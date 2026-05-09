-- Migration: 20260224280000_fix_supabase_uid_unique.sql
-- Purpose: Add UNIQUE constraint to supabase_uid to support ON CONFLICT in triggers.

BEGIN;

-- 1. Remove rows with NULL supabase_uid if they conflict with future auth users? 
-- Actually, we should just ensure supabase_uid is unique.
-- If there are duplicates (unlikely in fresh setup but possible in dev), we clean them.
DELETE FROM public.users a
USING public.users b
WHERE a.supabase_uid = b.supabase_uid AND a.id > b.id AND a.supabase_uid IS NOT NULL;

-- 2. Add Unique Constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_supabase_uid_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_supabase_uid_key UNIQUE (supabase_uid);
    END IF;
END $$;

-- 3. Update the trigger function to be extra robust
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
EXCEPTION WHEN OTHERS THEN
  -- Log the error if possible (Supabase logs will show this)
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN new; -- Still return new to allow auth user creation even if public user fail (optional, but prevents blocking auth)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
