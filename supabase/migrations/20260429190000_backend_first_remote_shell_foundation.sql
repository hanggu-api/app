CREATE TABLE IF NOT EXISTS public.remote_screen_definitions (
  id BIGSERIAL PRIMARY KEY,
  screen_key TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_scope TEXT NOT NULL DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remote_screen_variants (
  id BIGSERIAL PRIMARY KEY,
  screen_key TEXT NOT NULL REFERENCES public.remote_screen_definitions(screen_key) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  role_scope TEXT NOT NULL DEFAULT 'all',
  platform_scope TEXT NOT NULL DEFAULT 'all',
  status_scope TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  schema_version INTEGER NOT NULL DEFAULT 1,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  commands_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_policy JSONB NOT NULL DEFAULT '{"mode":"use_cache_then_native","allow_cache":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (screen_key, revision, role_scope, platform_scope, status_scope)
);

CREATE TABLE IF NOT EXISTS public.remote_screen_publications (
  id BIGSERIAL PRIMARY KEY,
  screen_key TEXT NOT NULL REFERENCES public.remote_screen_definitions(screen_key) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remote_action_policies (
  id BIGSERIAL PRIMARY KEY,
  screen_key TEXT NOT NULL REFERENCES public.remote_screen_definitions(screen_key) ON DELETE CASCADE,
  command_key TEXT NOT NULL,
  role_scope TEXT NOT NULL DEFAULT 'all',
  status_scope TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (screen_key, command_key, role_scope, status_scope)
);

CREATE TABLE IF NOT EXISTS public.remote_content_blocks (
  id BIGSERIAL PRIMARY KEY,
  block_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'generic',
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_screen_variants_lookup
  ON public.remote_screen_variants (screen_key, revision, role_scope, platform_scope, status_scope)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_remote_screen_publications_lookup
  ON public.remote_screen_publications (screen_key, is_active, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_remote_action_policies_lookup
  ON public.remote_action_policies (screen_key, command_key, is_active);

INSERT INTO public.remote_screen_definitions (screen_key, description, owner_scope)
VALUES
  ('help', 'Tela remota de ajuda', 'app'),
  ('home_explore', 'Tela remota de descoberta inicial', 'app'),
  ('driver_home', 'Home operacional remota do prestador', 'app'),
  ('provider_search', 'Busca de prestador guiada pelo backend', 'app'),
  ('service_payment', 'Fluxo remoto de pagamento do serviço', 'app')
ON CONFLICT (screen_key) DO UPDATE
SET
  description = EXCLUDED.description,
  owner_scope = EXCLUDED.owner_scope,
  updated_at = now();

INSERT INTO public.remote_screen_variants (
  screen_key,
  revision,
  role_scope,
  platform_scope,
  status_scope,
  schema_version,
  layout_json,
  meta_json,
  commands_used,
  fallback_policy
)
VALUES
  (
    'provider_search',
    1,
    'client',
    'all',
    'searching_provider',
    1,
    jsonb_build_object(
      'components',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'provider_search_status',
          'type', 'status_block',
          'props', jsonb_build_object(
            'title', 'Buscando o prestador mais próximo',
            'subtitle', 'Estamos consultando um prestador por vez por ordem de distância.',
            'status', 'searching',
            'margin', jsonb_build_array(0, 0, 0, 16)
          )
        ),
        jsonb_build_object(
          'id', 'provider_search_timeline',
          'type', 'timeline_step',
          'props', jsonb_build_object(
            'label', 'Busca iniciada',
            'description', 'Pagamento confirmado e fila preparada.'
          )
        ),
        jsonb_build_object(
          'id', 'provider_search_refresh',
          'type', 'button',
          'props', jsonb_build_object(
            'label', 'Atualizar busca',
            'style', 'primary'
          ),
          'action', jsonb_build_object(
            'type', 'command',
            'command_key', 'refresh_search_status',
            'arguments', jsonb_build_object('revision', 1)
          )
        )
      )
    ),
    jsonb_build_object(
      'ttl_seconds', 120,
      'layout', jsonb_build_object('kind', 'scroll'),
      'features', jsonb_build_object(
        'enabled', true,
        'kill_switch', false,
        'flags', jsonb_build_object('provider_search_v1', true)
      )
    ),
    '["refresh_search_status","open_support","cancel_service_request","show_search_details"]'::jsonb,
    '{"mode":"use_cache_then_native","allow_cache":true}'::jsonb
  ),
  (
    'service_payment',
    1,
    'client',
    'all',
    'all',
    1,
    jsonb_build_object(
      'components',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'service_payment_mode',
          'type', 'info_card',
          'props', jsonb_build_object(
            'title', 'Pagamento via Pix da plataforma',
            'subtitle', 'O backend decide o modo de cobrança e o frontend apenas apresenta as instruções.',
            'icon_key', 'badge_help'
          )
        ),
        jsonb_build_object(
          'id', 'service_payment_amount',
          'type', 'amount_card',
          'props', jsonb_build_object(
            'title', 'Valor do pagamento',
            'amount_label', 'R$ 45,00'
          )
        ),
        jsonb_build_object(
          'id', 'service_payment_generate',
          'type', 'button',
          'props', jsonb_build_object(
            'label', 'Gerar Pix',
            'style', 'primary'
          ),
          'action', jsonb_build_object(
            'type', 'command',
            'command_key', 'generate_platform_pix',
            'arguments', jsonb_build_object('payment_stage', 'deposit', 'revision', 1)
          )
        )
      )
    ),
    jsonb_build_object(
      'ttl_seconds', 120,
      'layout', jsonb_build_object('kind', 'scroll'),
      'features', jsonb_build_object(
        'enabled', true,
        'kill_switch', false,
        'flags', jsonb_build_object('service_payment_v1', true)
      )
    ),
    '["generate_platform_pix","open_pix_screen","retry_pix_generation","confirm_direct_payment_intent","open_support","return_home"]'::jsonb,
    '{"mode":"use_cache_then_native","allow_cache":true}'::jsonb
  )
ON CONFLICT (screen_key, revision, role_scope, platform_scope, status_scope) DO UPDATE
SET
  is_active = true,
  schema_version = EXCLUDED.schema_version,
  layout_json = EXCLUDED.layout_json,
  meta_json = EXCLUDED.meta_json,
  commands_used = EXCLUDED.commands_used,
  fallback_policy = EXCLUDED.fallback_policy,
  updated_at = now();

INSERT INTO public.remote_screen_publications (screen_key, revision, is_active)
VALUES
  ('provider_search', 1, true),
  ('service_payment', 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.remote_action_policies (screen_key, command_key, role_scope, status_scope, is_active)
VALUES
  ('provider_search', 'refresh_search_status', 'client', 'all', true),
  ('provider_search', 'open_support', 'client', 'all', true),
  ('provider_search', 'cancel_service_request', 'client', 'all', true),
  ('provider_search', 'show_search_details', 'client', 'all', true),
  ('service_payment', 'generate_platform_pix', 'client', 'all', true),
  ('service_payment', 'open_pix_screen', 'client', 'all', true),
  ('service_payment', 'retry_pix_generation', 'client', 'all', true),
  ('service_payment', 'confirm_direct_payment_intent', 'client', 'all', true),
  ('service_payment', 'open_support', 'client', 'all', true),
  ('service_payment', 'return_home', 'client', 'all', true)
ON CONFLICT (screen_key, command_key, role_scope, status_scope) DO UPDATE
SET
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.app_configs (
  key,
  value,
  description,
  category,
  platform_scope,
  is_active,
  revision
)
VALUES
  (
    'flag.remote_ui.provider_search.enabled',
    'true'::jsonb,
    'Habilita a superfície remota provider_search',
    'feature_flag',
    'all',
    true,
    1
  ),
  (
    'kill_switch.remote_ui.provider_search',
    'false'::jsonb,
    'Desliga remotamente a superfície provider_search',
    'kill_switch',
    'all',
    true,
    1
  ),
  (
    'flag.remote_ui.service_payment.enabled',
    'true'::jsonb,
    'Habilita a superfície remota service_payment',
    'feature_flag',
    'all',
    true,
    1
  ),
  (
    'kill_switch.remote_ui.service_payment',
    'false'::jsonb,
    'Desliga remotamente a superfície service_payment',
    'kill_switch',
    'all',
    true,
    1
  )
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  platform_scope = EXCLUDED.platform_scope,
  is_active = EXCLUDED.is_active,
  revision = EXCLUDED.revision;
