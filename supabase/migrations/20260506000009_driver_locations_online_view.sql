-- =====================================================
-- MIGRATION: View de Driver Locations com cálculo de
--            tempo online em tempo real
-- =====================================================
-- Cria uma VIEW que adiciona dois campos calculados:
--   seconds_since_update: segundos desde o último GPS
--   is_online: true se atualizou nos últimos 15 minutos

CREATE OR REPLACE VIEW public.driver_locations_status AS
SELECT
  dl.driver_id,
  dl.latitude,
  dl.longitude,
  dl.updated_at,
  -- Tempo em segundos desde a última atualização
  EXTRACT(EPOCH FROM (now() - dl.updated_at))::integer AS seconds_since_update,
  -- Critério: online se atualizou nos últimos 15 minutos (900 segundos)
  CASE
    WHEN dl.updated_at >= now() - interval '15 minutes' THEN true
    ELSE false
  END AS is_online
FROM public.driver_locations dl;

-- Comentários para documentação
COMMENT ON VIEW public.driver_locations_status IS
  'View de leitura que expõe a localização dos prestadores com cálculo dinâmico de:
   - seconds_since_update: tempo em segundos desde o último envio de GPS
   - is_online: true se o prestador enviou GPS nos últimos 15 minutos';

-- Garantir permissão de leitura para o service_role e anon
GRANT SELECT ON public.driver_locations_status TO anon, authenticated, service_role;
