-- Keep only the last known provider heartbeat position (UUID-first).
-- This avoids unbounded growth from provider_heartbeat_logs when GPS ticks frequently.

CREATE TABLE IF NOT EXISTS public.provider_heartbeat_last (
  provider_uid uuid primary key,
  provider_id bigint,
  latitude double precision,
  longitude double precision,
  source text,
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_provider_heartbeat_last_provider_id
  ON public.provider_heartbeat_last(provider_id);

ALTER TABLE public.provider_heartbeat_last ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write last positions (location data).
DROP POLICY IF EXISTS "service_role can manage provider heartbeat last" ON public.provider_heartbeat_last;
CREATE POLICY "service_role can manage provider heartbeat last"
  ON public.provider_heartbeat_last
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update provider_heartbeat RPC:
-- - Always upsert the last position into provider_heartbeat_last
-- - Keep provider_heartbeat_logs only for errors (diagnostics)
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
    -- Only log errors (avoid flooding).
    INSERT INTO public.provider_heartbeat_logs(provider_uid, provider_id, latitude, longitude, source, ok, error)
    VALUES (NULL, NULL, p_lat, p_lon, 'rpc', false, 'not_authenticated');
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT u.id
  INTO v_legacy_id
  FROM public.users u
  WHERE u.supabase_uid = v_uid
    AND u.role = 'provider'
  LIMIT 1;

  IF v_legacy_id IS NULL THEN
    INSERT INTO public.provider_heartbeat_logs(provider_uid, provider_id, latitude, longitude, source, ok, error)
    VALUES (v_uid, NULL, p_lat, p_lon, 'rpc', false, 'not_a_provider');
    RAISE EXCEPTION 'not_a_provider';
  END IF;

  -- Source of truth for realtime/provider discovery
  INSERT INTO public.provider_locations (provider_uid, provider_id, latitude, longitude, updated_at)
  VALUES (v_uid, v_legacy_id, p_lat, p_lon, v_now)
  ON CONFLICT (provider_uid)
  DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = EXCLUDED.updated_at;

  -- Keep only last heartbeat (no growth)
  INSERT INTO public.provider_heartbeat_last (provider_uid, provider_id, latitude, longitude, source, updated_at)
  VALUES (v_uid, v_legacy_id, p_lat, p_lon, 'rpc', v_now)
  ON CONFLICT (provider_uid)
  DO UPDATE SET
    provider_id = EXCLUDED.provider_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    source = EXCLUDED.source,
    updated_at = EXCLUDED.updated_at;

  UPDATE public.users
  SET last_seen_at = v_now
  WHERE supabase_uid = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'provider_uid', v_uid,
    'provider_id', v_legacy_id,
    'updated_at', v_now
  );
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.provider_heartbeat_logs(provider_uid, provider_id, latitude, longitude, source, ok, error)
    VALUES (v_uid, v_legacy_id, p_lat, p_lon, 'rpc', false, SQLERRM);
  EXCEPTION WHEN OTHERS THEN
    -- ignore
  END;
  RAISE;
END;
$$;

