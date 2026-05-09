-- Ensure dispatch can find providers even when `provider_locations` is missing/stale.
-- Uses live GPS from `provider_locations` when present, otherwise falls back to `providers.latitude/longitude`.

CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_profession_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id           BIGINT,
  name         TEXT,
  fcm_token    TEXT,
  distance_km  DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  WITH coords AS (
    SELECT
      u.id::bigint AS id,
      u.full_name AS name,
      u.fcm_token,
      COALESCE(pl.latitude::double precision, p.latitude::double precision)  AS lat,
      COALESCE(pl.longitude::double precision, p.longitude::double precision) AS lon
    FROM public.users u
    LEFT JOIN public.provider_locations pl
      ON pl.provider_id = u.id
    LEFT JOIN public.providers p
      ON p.user_id = u.id
    WHERE
      u.role = 'provider'
      AND u.fcm_token IS NOT NULL
  )
  SELECT
    c.id,
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
        WHERE pp.provider_user_id = c.id
          AND pp.profession_id = p_profession_id
      )
    )
  ORDER BY distance_km ASC
  LIMIT 10;
$$;

