-- Dual-write UUID columns to progressively migrate legacy BIGINT ids to auth.uid (UUID).
-- This migration is designed to be non-breaking: legacy columns remain and are kept in sync.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) provider_locations: add provider_uid + sync triggers + RLS update
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.provider_locations
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

-- Backfill provider_uid from users.supabase_uid
UPDATE public.provider_locations pl
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE u.id = pl.provider_id
  AND pl.provider_uid IS NULL
  AND u.supabase_uid IS NOT NULL;

-- Ensure one row per provider_uid (required for realtime-by-uid queries)
CREATE UNIQUE INDEX IF NOT EXISTS provider_locations_provider_uid_ux
  ON public.provider_locations(provider_uid)
  WHERE provider_uid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_provider_locations_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If provider_uid missing but provider_id present, fill from users.
  IF NEW.provider_uid IS NULL AND NEW.provider_id IS NOT NULL THEN
    SELECT u.supabase_uid INTO NEW.provider_uid
    FROM public.users u
    WHERE u.id = NEW.provider_id
    LIMIT 1;
  END IF;

  -- If provider_id missing but provider_uid present, fill from users.
  IF NEW.provider_id IS NULL AND NEW.provider_uid IS NOT NULL THEN
    SELECT u.id INTO NEW.provider_id
    FROM public.users u
    WHERE u.supabase_uid = NEW.provider_uid
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_provider_locations_ids ON public.provider_locations;
CREATE TRIGGER trg_sync_provider_locations_ids
BEFORE INSERT OR UPDATE ON public.provider_locations
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_locations_ids();

-- Update provider_locations RLS to be UUID-first for providers updating their own location.
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Providers can update own location" ON public.provider_locations;
-- Keep this policy scoped to writes only (UPDATE/INSERT) to avoid unintentionally granting deletes.
CREATE POLICY "Providers can update own location"
  ON public.provider_locations
  FOR UPDATE
  TO authenticated
  USING (provider_uid = auth.uid())
  WITH CHECK (provider_uid = auth.uid());

DROP POLICY IF EXISTS "Providers can insert own location" ON public.provider_locations;
CREATE POLICY "Providers can insert own location"
  ON public.provider_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (provider_uid = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) service_requests_new: add client_uid/provider_uid + sync triggers
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.service_requests_new
  ADD COLUMN IF NOT EXISTS client_uid uuid,
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

-- Backfill uid columns from users
UPDATE public.service_requests_new s
SET client_uid = u.supabase_uid
FROM public.users u
WHERE u.id = s.client_id
  AND s.client_uid IS NULL
  AND u.supabase_uid IS NOT NULL;

UPDATE public.service_requests_new s
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE u.id = s.provider_id
  AND s.provider_uid IS NULL
  AND u.supabase_uid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_service_requests_new_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- client
  IF NEW.client_uid IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT u.supabase_uid INTO NEW.client_uid
    FROM public.users u
    WHERE u.id = NEW.client_id
    LIMIT 1;
  END IF;
  IF NEW.client_id IS NULL AND NEW.client_uid IS NOT NULL THEN
    SELECT u.id INTO NEW.client_id
    FROM public.users u
    WHERE u.supabase_uid = NEW.client_uid
    LIMIT 1;
  END IF;

  -- provider
  IF NEW.provider_uid IS NULL AND NEW.provider_id IS NOT NULL THEN
    SELECT u.supabase_uid INTO NEW.provider_uid
    FROM public.users u
    WHERE u.id = NEW.provider_id
    LIMIT 1;
  END IF;
  IF NEW.provider_id IS NULL AND NEW.provider_uid IS NOT NULL THEN
    SELECT u.id INTO NEW.provider_id
    FROM public.users u
    WHERE u.supabase_uid = NEW.provider_uid
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_service_requests_new_ids ON public.service_requests_new;
CREATE TRIGGER trg_sync_service_requests_new_ids
BEFORE INSERT OR UPDATE ON public.service_requests_new
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_requests_new_ids();

-- Add UUID-first helper policies without removing legacy ones (non-breaking).
ALTER TABLE public.service_requests_new ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own service_requests (uid)" ON public.service_requests_new;
CREATE POLICY "Users can view own service_requests (uid)"
  ON public.service_requests_new
  FOR SELECT
  TO authenticated
  USING (client_uid = auth.uid() OR provider_uid = auth.uid());

DROP POLICY IF EXISTS "Users can update own service_requests (uid)" ON public.service_requests_new;
CREATE POLICY "Users can update own service_requests (uid)"
  ON public.service_requests_new
  FOR UPDATE
  TO authenticated
  USING (client_uid = auth.uid() OR provider_uid = auth.uid())
  WITH CHECK (client_uid = auth.uid() OR provider_uid = auth.uid());
