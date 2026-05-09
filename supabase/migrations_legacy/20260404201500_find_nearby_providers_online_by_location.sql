-- Make "online" provider filter consistent with live GPS:
-- - primary signal: provider_locations.updated_at within 5 minutes
-- - fallback: users.last_seen_at within 5 minutes (more permissive)
--
-- Keeps return type (id uuid, name, fcm_token, distance_km) to avoid breaking callers.

CREATE OR REPLACE FUNCTION public.find_nearby_providers(
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
      pl.updated_at AS loc_updated_at,
      COALESCE(pl.latitude::double precision, p.latitude::double precision)  AS lat,
      COALESCE(pl.longitude::double precision, p.longitude::double precision) AS lon
    FROM public.users u
    LEFT JOIN public.provider_locations pl
      ON pl.provider_id = u.id
    LEFT JOIN public.providers p
      ON p.user_id = u.id
    WHERE
      u.role = 'provider'
      AND u.supabase_uid IS NOT NULL
      AND u.fcm_token IS NOT NULL
      AND (
        (pl.updated_at IS NOT NULL AND pl.updated_at > now() - interval '5 minutes')
        OR (u.last_seen_at IS NOT NULL AND u.last_seen_at > now() - interval '5 minutes')
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

