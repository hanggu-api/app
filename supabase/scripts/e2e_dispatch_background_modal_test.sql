-- E2E: criar servico novo para validar oferta via push com app em segundo plano
-- Objetivo: testar se a notificacao/alerta de oferta consegue abrir o fluxo
-- mesmo com o app do prestador atras de outro aplicativo no Android.
--
-- Como usar:
-- 1) Garanta que o prestador de teste:
--    - esteja logado no app Android;
--    - tenha concedido notificacoes, overlay e full-screen intent;
--    - deixe o app em background e abra outro app qualquer.
-- 2) Rode este SQL no banco.
-- 3) Copie o service_id retornado no NOTICE/SELECT final.
-- 4) Dispare o dispatch manualmente:
--      supabase functions invoke dispatch --no-verify-jwt \
--        --body '{"serviceId":"<SERVICE_ID>","action":"start_dispatch"}'
-- 5) Aguarde o worker `dispatch-queue` notificar o prestador.
--
-- Observacao:
-- - Este script prioriza um prestador com `fcm_token` real e profissao vinculada.
-- - O servico e criado como `searching` + `paid` para entrar no fluxo de dispatch.

DO $$
DECLARE
  v_provider_user_id bigint;
  v_provider_uid uuid;
  v_provider_name text;
  v_provider_fcm_token text;
  v_profession_id int;
  v_client_user_id bigint;
  v_client_uid uuid;
  v_service_id uuid;
  v_lat double precision := -5.526390;
  v_lon double precision := -47.491670;
  v_now timestamptz := now();
BEGIN
  -- Escolhe um prestador com token FCM real, UID valido e profissao vinculada.
  SELECT
    u.id,
    u.supabase_uid,
    u.full_name,
    u.fcm_token,
    pp.profession_id
  INTO
    v_provider_user_id,
    v_provider_uid,
    v_provider_name,
    v_provider_fcm_token,
    v_profession_id
  FROM public.users u
  JOIN public.provider_professions pp
    ON pp.provider_user_id = u.id
  WHERE u.role = 'provider'
    AND u.supabase_uid IS NOT NULL
    AND nullif(trim(coalesce(u.fcm_token, '')), '') IS NOT NULL
  ORDER BY u.last_seen_at DESC NULLS LAST, u.id ASC
  LIMIT 1;

  IF v_provider_user_id IS NULL OR v_provider_uid IS NULL OR v_profession_id IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: nao encontrou prestador com FCM token + profissao.';
  END IF;

  -- Escolhe um cliente valido.
  SELECT u.id, u.supabase_uid
    INTO v_client_user_id, v_client_uid
  FROM public.users u
  WHERE u.role IN ('client', 'customer', 'passenger')
    AND u.supabase_uid IS NOT NULL
  ORDER BY u.id
  LIMIT 1;

  IF v_client_user_id IS NULL OR v_client_uid IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: nao encontrou cliente valido.';
  END IF;

  -- Marca o prestador como online e com localizacao fresca, perto do servico.
  UPDATE public.users
     SET last_seen_at = v_now
   WHERE id = v_provider_user_id;

  INSERT INTO public.provider_locations (
    provider_id,
    provider_uid,
    latitude,
    longitude,
    updated_at
  )
  VALUES (
    v_provider_user_id,
    v_provider_uid,
    v_lat,
    v_lon,
    v_now
  )
  ON CONFLICT (provider_id) DO UPDATE
    SET provider_uid = excluded.provider_uid,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = excluded.updated_at;

  -- Cria um servico novo pronto para dispatch.
  INSERT INTO public.service_requests_new (
    client_id,
    client_uid,
    category_id,
    description,
    latitude,
    longitude,
    address,
    price_estimated,
    price_upfront,
    status,
    payment_status,
    profession_id,
    location_type,
    created_at
  )
  VALUES (
    v_client_user_id,
    v_client_uid,
    1,
    'E2E background modal test',
    v_lat,
    v_lon,
    'Endereco E2E background modal',
    100.00,
    30.00,
    'searching',
    'paid',
    v_profession_id,
    'client',
    v_now
  )
  RETURNING id INTO v_service_id;

  RAISE NOTICE 'service_id=% provider_user_id=% provider_name=% profession_id=% fcm_token_prefix=%',
    v_service_id,
    v_provider_user_id,
    coalesce(v_provider_name, '<sem_nome>'),
    v_profession_id,
    left(coalesce(v_provider_fcm_token, ''), 16);
END $$;

-- Consulta de conferência rapida do servico criado.
-- Rode apos copiar o service_id:
--
-- SELECT
--   id,
--   status,
--   payment_status,
--   profession_id,
--   provider_id,
--   created_at
-- FROM public.service_requests_new
-- WHERE id = '<SERVICE_ID>'::uuid;
--
-- Fila do dispatch:
-- SELECT
--   service_id,
--   status,
--   next_run_at,
--   attempts,
--   last_error,
--   updated_at
-- FROM public.service_dispatch_queue
-- WHERE service_id = '<SERVICE_ID>'::uuid;
--
-- Linhas de oferta materializadas/notificadas:
-- SELECT
--   id,
--   provider_user_id,
--   status,
--   ciclo_atual,
--   queue_order,
--   notification_count,
--   last_notified_at,
--   response_deadline_at,
--   push_status,
--   push_error_code,
--   push_error_type
-- FROM public.notificacao_de_servicos
-- WHERE service_id = '<SERVICE_ID>'::uuid
-- ORDER BY ciclo_atual, queue_order, id;
--
-- Logs relevantes:
-- SELECT
--   action,
--   details,
--   created_at
-- FROM public.service_logs
-- WHERE service_id = '<SERVICE_ID>'::uuid
--   AND action IN (
--     'DISPATCH_STARTED',
--     'DISPATCH_QUEUE_MATERIALIZED',
--     'PROVIDER_NOTIFIED',
--     'PROVIDER_NOTIFIED_TRANSIENT_PUSH',
--     'PROVIDER_SKIPPED_UNDELIVERABLE',
--     'QUEUE_TIMEOUT_ADVANCE',
--     'QUEUE_ERROR'
--   )
-- ORDER BY created_at DESC;
