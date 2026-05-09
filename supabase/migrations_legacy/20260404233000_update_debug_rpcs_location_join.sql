-- Improve debug RPCs to use the latest provider_locations row by either provider_uid or provider_id.
-- This avoids false negatives during dual-write migrations.

CREATE OR REPLACE FUNCTION public.find_nearby_providers_debug(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_profession_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  legacy_user_id  BIGINT,
  provider_uid    UUID,
  name            TEXT,
  fcm_token       TEXT,
  last_seen_at    TIMESTAMPTZ,
  loc_updated_at  TIMESTAMPTZ,
  lat             DOUBLE PRECISION,
  lon             DOUBLE PRECISION,
  distance_km     DOUBLE PRECISION,
  coords_ok       BOOLEAN,
  online_ok       BOOLEAN,
  within_radius   BOOLEAN,
  has_profession  BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      u.id::bigint AS legacy_user_id,
      u.supabase_uid::uuid AS provider_uid,
      u.full_name AS name,
      u.fcm_token,
      u.last_seen_at,
      pl.loc_updated_at,
      COALESCE(pl.lat::double precision, p.latitude::double precision)  AS lat,
      COALESCE(pl.lon::double precision, p.longitude::double precision) AS lon
    FROM public.users u
    LEFT JOIN LATERAL (
      SELECT
        pl.updated_at AS loc_updated_at,
        pl.latitude AS lat,
        pl.longitude AS lon
      FROM public.provider_locations pl
      WHERE (u.supabase_uid IS NOT NULL AND pl.provider_uid = u.supabase_uid)
         OR pl.provider_id = u.id
      ORDER BY pl.updated_at DESC
      LIMIT 1
    ) pl ON true
    LEFT JOIN public.providers p
      ON p.user_id = u.id
    WHERE
      u.role = 'provider'
      AND u.supabase_uid IS NOT NULL
  ),
  calc AS (
    SELECT
      b.*,
      (b.lat IS NOT NULL AND b.lon IS NOT NULL) AS coords_ok,
      (
        (b.loc_updated_at IS NOT NULL AND b.loc_updated_at > now() - interval '15 minutes')
        OR (b.last_seen_at IS NOT NULL AND b.last_seen_at > now() - interval '15 minutes')
      ) AS online_ok,
      (
        6371 * acos(
          LEAST(
            1.0,
            cos(radians(p_lat)) * cos(radians(b.lat))
            * cos(radians(b.lon) - radians(p_lon))
            + sin(radians(p_lat)) * sin(radians(b.lat))
          )
        )
      ) AS distance_km,
      (
        p_profession_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.provider_professions pp
          WHERE pp.provider_user_id = b.legacy_user_id
            AND pp.profession_id = p_profession_id
        )
      ) AS has_profession
    FROM base b
  )
  SELECT
    c.legacy_user_id,
    c.provider_uid,
    c.name,
    c.fcm_token,
    c.last_seen_at,
    c.loc_updated_at,
    c.lat,
    c.lon,
    c.distance_km,
    c.coords_ok,
    c.online_ok,
    (c.distance_km <= p_radius_km) AS within_radius,
    c.has_profession
  FROM calc c
  WHERE c.coords_ok
  ORDER BY c.distance_km ASC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_provider_debug_counts(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_profession_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      u.id::bigint AS legacy_user_id,
      u.supabase_uid::uuid AS provider_uid,
      u.fcm_token,
      u.last_seen_at,
      pl.loc_updated_at,
      COALESCE(pl.lat::double precision, p.latitude::double precision)  AS lat,
      COALESCE(pl.lon::double precision, p.longitude::double precision) AS lon
    FROM public.users u
    LEFT JOIN LATERAL (
      SELECT
        pl.updated_at AS loc_updated_at,
        pl.latitude AS lat,
        pl.longitude AS lon
      FROM public.provider_locations pl
      WHERE (u.supabase_uid IS NOT NULL AND pl.provider_uid = u.supabase_uid)
         OR pl.provider_id = u.id
      ORDER BY pl.updated_at DESC
      LIMIT 1
    ) pl ON true
    LEFT JOIN public.providers p
      ON p.user_id = u.id
    WHERE
      u.role = 'provider'
      AND u.supabase_uid IS NOT NULL
  ),
  enriched AS (
    SELECT
      b.*,
      (b.fcm_token IS NOT NULL) AS has_fcm,
      (b.lat IS NOT NULL AND b.lon IS NOT NULL) AS coords_ok,
      (
        (b.loc_updated_at IS NOT NULL AND b.loc_updated_at > now() - interval '15 minutes')
        OR (b.last_seen_at IS NOT NULL AND b.last_seen_at > now() - interval '15 minutes')
      ) AS online_ok,
      (
        6371 * acos(
          LEAST(
            1.0,
            cos(radians(p_lat)) * cos(radians(b.lat))
            * cos(radians(b.lon) - radians(p_lon))
            + sin(radians(p_lat)) * sin(radians(b.lat))
          )
        )
      ) AS distance_km,
      (
        p_profession_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.provider_professions pp
          WHERE pp.provider_user_id = b.legacy_user_id
            AND pp.profession_id = p_profession_id
        )
      ) AS has_profession
    FROM base b
  )
  SELECT jsonb_build_object(
    'stage1_role_provider', (SELECT count(*) FROM enriched),
    'stage1b_has_fcm', (SELECT count(*) FROM enriched WHERE has_fcm),
    'stage2_coords_ok', (SELECT count(*) FROM enriched WHERE has_fcm AND coords_ok),
    'stage3_online_ok', (SELECT count(*) FROM enriched WHERE has_fcm AND coords_ok AND online_ok),
    'stage4_within_radius', (SELECT count(*) FROM enriched WHERE has_fcm AND coords_ok AND online_ok AND distance_km <= p_radius_km),
    'stage5_has_profession', (SELECT count(*) FROM enriched WHERE has_fcm AND coords_ok AND online_ok AND distance_km <= p_radius_km AND has_profession),
    'radius_km', p_radius_km,
    'profession_id', p_profession_id
  );
$$;

