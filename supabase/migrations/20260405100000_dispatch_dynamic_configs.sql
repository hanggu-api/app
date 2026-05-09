-- Dispatch dynamic configs via app_configs so behavior can be tuned without redeploy.

INSERT INTO public.app_configs (key, value, description) VALUES
  (
    'dispatch_search_radius_km',
    '[5,10,20,50]'::jsonb,
    'Lista de raios (km) por round do dispatch (Uber-style).'
  ),
  (
    'dispatch_notify_timeout_seconds',
    '30'::jsonb,
    'Tempo (s) que o prestador tem para aceitar a oferta antes de expirar.'
  ),
  (
    'dispatch_retry_same_provider',
    'false'::jsonb,
    'Permite reofertar o mesmo serviço para o mesmo prestador em rounds futuros.'
  ),
  (
    'dispatch_max_offers_per_provider',
    '1'::jsonb,
    'Máximo de vezes que um mesmo prestador pode ser notificado para o mesmo service_id (1 = nunca reoferta).'
  ),
  (
    'dispatch_offer_cooldown_seconds',
    '120'::jsonb,
    'Cooldown (s) mínimo entre duas notificações para o mesmo prestador e service_id (mesmo quando reoferta é permitida).'
  )
ON CONFLICT (key) DO NOTHING;

