-- Refine driver matching by passenger payment method (manual methods)
-- Date: 2026-03-27

DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, double precision, integer);

CREATE FUNCTION public.find_nearby_drivers(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_vehicle_type_id INTEGER,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  full_name TEXT,
  fcm_token TEXT,
  distance_km DOUBLE PRECISION,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  accepts_pix_direct BOOLEAN,
  accepts_card_machine BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  p_method TEXT := lower(btrim(coalesce(p_payment_method, '')));
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.fcm_token,
    (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(p_lat)) * cos(radians(dl.latitude))
          * cos(radians(dl.longitude) - radians(p_lon))
          + sin(radians(p_lat)) * sin(radians(dl.latitude))
        )
      )
    ) AS distance_km,
    v.model::TEXT AS vehicle_model,
    v.plate::TEXT AS vehicle_plate,
    COALESCE(u.accepts_pix_direct, false) AS accepts_pix_direct,
    COALESCE(u.accepts_card_machine, false) AS accepts_card_machine
  FROM public.users u
  JOIN public.driver_locations dl ON dl.driver_id = u.id
  JOIN public.vehicles v ON v.driver_id = u.id
  WHERE
    u.role = 'driver'
    AND u.is_active = TRUE
    AND u.fcm_token IS NOT NULL
    AND v.vehicle_type_id = p_vehicle_type_id
    AND (
      6371 * acos(
        LEAST(
          1.0,
          cos(radians(p_lat)) * cos(radians(dl.latitude))
          * cos(radians(dl.longitude) - radians(p_lon))
          + sin(radians(p_lat)) * sin(radians(dl.latitude))
        )
      )
    ) <= p_radius_km
    AND (
      p_method = ''
      OR (p_method LIKE '%card_machine%' AND COALESCE(u.accepts_card_machine, false) = TRUE)
      OR (p_method LIKE '%pix_direct%' AND COALESCE(u.accepts_pix_direct, false) = TRUE)
      OR (p_method NOT LIKE '%card_machine%' AND p_method NOT LIKE '%pix_direct%')
    )
  ORDER BY distance_km ASC
  LIMIT 15;
END;
$$;

COMMENT ON FUNCTION public.find_nearby_drivers(double precision, double precision, double precision, integer, text)
IS 'Find nearby active drivers by location/vehicle; optionally filter by manual payment method (pix_direct/card_machine).';

