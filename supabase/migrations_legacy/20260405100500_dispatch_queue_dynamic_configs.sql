-- Dynamic worker scheduling knobs for dispatch-queue (app_configs).

INSERT INTO public.app_configs (key, value, description) VALUES
  (
    'dispatch_queue_min_interval_seconds',
    '60'::jsonb,
    'Intervalo mínimo (s) entre execuções do worker por service_id (limita spam/custo).'
  )
ON CONFLICT (key) DO NOTHING;

