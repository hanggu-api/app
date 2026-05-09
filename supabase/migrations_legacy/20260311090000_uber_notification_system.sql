-- Migration: uber_notification_system
-- Funções e RPCs para o sistema de notificações de novas corridas

BEGIN;

-- Remove versões anteriores da função com qualquer assinatura
DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, double precision, integer);
DROP FUNCTION IF EXISTS public.find_nearby_drivers(float8, float8, float8, int4);
DROP FUNCTION IF EXISTS public.find_nearby_drivers(numeric, numeric, numeric, integer);

-- 1. RPC: find_nearby_drivers
-- Busca motoristas online, ativos e próximos filtrando por tipo de veículo
CREATE FUNCTION public.find_nearby_drivers(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION,
    p_vehicle_type_id INTEGER
)
RETURNS TABLE (
    id           INTEGER,
    full_name    TEXT,
    fcm_token    TEXT,
    distance_km  DOUBLE PRECISION,
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
                LEAST(1.0, cos(radians(p_lat)) * cos(radians(dl.latitude))
                * cos(radians(dl.longitude) - radians(p_lon))
                + sin(radians(p_lat)) * sin(radians(dl.latitude)))
            )
        ) AS distance_km,
        v.model as vehicle_model,
        v.plate as vehicle_plate
    FROM public.users u
    JOIN public.driver_locations dl ON dl.driver_id = u.id
    JOIN public.vehicles v ON v.driver_id = u.id
    WHERE
        u.role = 'driver'
        AND u.is_active = true
        AND u.fcm_token IS NOT NULL
        AND v.vehicle_type_id = p_vehicle_type_id
        AND (
            6371 * acos(
                LEAST(1.0, cos(radians(p_lat)) * cos(radians(dl.latitude))
                * cos(radians(dl.longitude) - radians(p_lon))
                + sin(radians(p_lat)) * sin(radians(dl.latitude)))
            )
        ) <= p_radius_km
    ORDER BY distance_km ASC
    LIMIT 15;
END;
$$;

-- Comentário com assinatura completa para evitar ambiguidade
COMMENT ON FUNCTION public.find_nearby_drivers(double precision, double precision, double precision, integer)
    IS 'Busca motoristas online e ativos dentro de um raio geográfico, filtrados pelo tipo de veículo da corrida.';

COMMIT;

