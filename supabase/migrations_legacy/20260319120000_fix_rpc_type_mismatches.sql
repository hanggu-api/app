-- Fix RPC typing mismatches flagged by `supabase db lint`

BEGIN;

-- Keep external compatibility (TEXT input) and cast to UUID internally.
CREATE OR REPLACE FUNCTION public.rpc_confirm_completion(
  p_service_id TEXT,
  p_code TEXT,
  p_proof_video TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_stored_code TEXT;
  v_price_estimated DECIMAL;
  v_provider_id BIGINT;
  v_provider_amount DECIMAL;
  v_service_uuid UUID;
BEGIN
  v_service_uuid := p_service_id::UUID;

  SELECT status, completion_code, price_estimated, provider_id
    INTO v_status, v_stored_code, v_price_estimated, v_provider_id
  FROM public.service_requests_new
  WHERE id = v_service_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  IF v_status != 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Service is not awaiting confirmation';
  END IF;

  IF v_stored_code != p_code THEN
    RETURN FALSE;
  END IF;

  v_provider_amount := COALESCE(v_price_estimated, 0) * 0.85;

  UPDATE public.service_requests_new
  SET
    status = 'completed',
    completed_at = NOW(),
    status_updated_at = NOW(),
    proof_video = p_proof_video,
    provider_amount = v_provider_amount
  WHERE id = v_service_uuid;

  IF v_provider_id IS NOT NULL THEN
    UPDATE public.providers
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_provider_amount
    WHERE user_id = v_provider_id;

    INSERT INTO public.wallet_transactions (id, user_id, service_id, amount, type, description, created_at)
    VALUES (
      gen_random_uuid(),
      v_provider_id,
      v_service_uuid,
      v_provider_amount,
      'credit',
      'Credito pelo servico ' || p_service_id,
      NOW()
    );
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_request_completion(
  p_service_id TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_service_uuid UUID;
BEGIN
  v_service_uuid := p_service_id::UUID;
  v_code := floor(random() * 899999 + 100000)::TEXT;

  UPDATE public.service_requests_new
  SET
    completion_code = v_code,
    status = 'awaiting_confirmation',
    status_updated_at = NOW()
  WHERE id = v_service_uuid;

  RETURN v_code;
END;
$$;

DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, double precision, integer);

CREATE FUNCTION public.find_nearby_drivers(
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION,
  p_vehicle_type_id INTEGER
)
RETURNS TABLE (
  id BIGINT,
  full_name TEXT,
  fcm_token TEXT,
  distance_km DOUBLE PRECISION,
  vehicle_model TEXT,
  vehicle_plate TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
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
    v.model AS vehicle_model,
    v.plate AS vehicle_plate
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
  ORDER BY distance_km ASC
  LIMIT 15;
END;
$$;

COMMENT ON FUNCTION public.find_nearby_drivers(double precision, double precision, double precision, integer)
  IS 'Busca motoristas online e ativos dentro de um raio geográfico, filtrados pelo tipo de veículo da corrida.';

COMMIT;
