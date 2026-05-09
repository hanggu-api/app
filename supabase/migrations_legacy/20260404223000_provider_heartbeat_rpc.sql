-- UUID-first provider heartbeat to keep providers "online" even with flaky mobile networks.
-- Updates provider_locations.updated_at (source of truth) and users.last_seen_at (fallback).
--
-- This is SECURITY DEFINER so it can write consistently without relying on client-side RLS/legacy IDs.
-- It uses auth.uid() (UUID) as the primary identity and keeps provider_id (legacy users.id) in sync.

-- Ensure provider_uid column exists for UUID-first operations.
ALTER TABLE public.provider_locations
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

-- Backfill provider_uid for existing rows.
UPDATE public.provider_locations pl
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE pl.provider_uid IS NULL
  AND pl.provider_id = u.id
  AND u.supabase_uid IS NOT NULL;

-- Avoid duplicate rows per provider_uid.
CREATE UNIQUE INDEX IF NOT EXISTS provider_locations_provider_uid_uniq
ON public.provider_locations(provider_uid)
WHERE provider_uid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.provider_heartbeat(
  p_lat double precision,
  p_lon double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_legacy_id bigint;
  v_now timestamptz := now();
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.id
  INTO v_legacy_id
  FROM public.users u
  WHERE u.supabase_uid = v_uid
    AND u.role = 'provider'
  LIMIT 1;

  IF v_legacy_id IS NULL THEN
    RAISE EXCEPTION 'not_a_provider';
  END IF;

  -- Update location (upsert by provider_uid).
  INSERT INTO public.provider_locations (provider_uid, provider_id, latitude, longitude, updated_at)
  VALUES (v_uid, v_legacy_id, p_lat, p_lon, v_now)
  ON CONFLICT (provider_uid)
  DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = EXCLUDED.updated_at;

  -- Fallback online signal.
  UPDATE public.users
  SET last_seen_at = v_now
  WHERE supabase_uid = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'provider_uid', v_uid,
    'provider_id', v_legacy_id,
    'updated_at', v_now
  );
END;
$$;

