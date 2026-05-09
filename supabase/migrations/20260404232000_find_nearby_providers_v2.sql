-- New, non-overloaded provider discovery RPC to avoid PostgREST ambiguity (PGRST203).
-- UUID-first + online TTL 15 minutes (provider_locations.updated_at primary, users.last_seen_at fallback).
--
-- Returns: id (provider_uid), name, fcm_token, distance_km.

CREATE OR REPLACE FUNCTION public.find_nearby_providers_v2(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_profession_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  fcm_token    TEXT,
  distance_km  DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  WITH coords AS (
    SELECT
      u.id::bigint AS user_id,
      u.supabase_uid::uuid AS provider_uid,
      u.full_name AS name,
      u.fcm_token,
      u.last_seen_at,
      pl.loc_updated_at AS loc_updated_at,
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
      AND u.fcm_token IS NOT NULL
      AND (
        (pl.loc_updated_at IS NOT NULL AND pl.loc_updated_at > now() - interval '15 minutes')
        OR (u.last_seen_at IS NOT NULL AND u.last_seen_at > now() - interval '15 minutes')
      )
  )
  SELECT
    c.provider_uid AS id,
    c.name,
    c.fcm_token,
    (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(p_lat)) * cos(radians(c.lat))
          * cos(radians(c.lon) - radians(p_lon))
          + sin(radians(p_lat)) * sin(radians(c.lat))
        )
      )
    ) AS distance_km
  FROM coords c
  WHERE
    c.lat IS NOT NULL
    AND c.lon IS NOT NULL
    AND (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(p_lat)) * cos(radians(c.lat))
          * cos(radians(c.lon) - radians(p_lon))
          + sin(radians(p_lat)) * sin(radians(c.lat))
        )
      )
    ) <= p_radius_km
    AND (
      p_profession_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.provider_professions pp
        WHERE pp.provider_user_id = c.user_id
          AND pp.profession_id = p_profession_id
      )
    )
  ORDER BY distance_km ASC
  LIMIT 10;
$$;
