-- E2E: serviço novo -> searching/paid -> dispatch -> notificacao_de_servicos
-- Objetivo: validar que somente profissionais da mesma profissão entram na fila.
--
-- Como usar:
-- 1) Rode este SQL no banco.
-- 2) Pegue o service_id retornado no SELECT final.
-- 3) Dispare o dispatch:
--      supabase functions invoke dispatch --no-verify-jwt \
--        --body '{"serviceId":"<SERVICE_ID>","action":"start_dispatch"}'
-- 4) Rode as queries de validação no final deste arquivo.

DO $$
DECLARE
  v_provider_user_id bigint;
  v_provider_uid uuid;
  v_profession_id int;
  v_client_user_id bigint;
  v_client_uid uuid;
  v_service_id uuid;
  v_now timestamptz := now();
BEGIN
  -- Escolhe profissão existente que tenha ao menos 1 prestador.
  SELECT pp.profession_id, pp.provider_user_id, u.supabase_uid
    INTO v_profession_id, v_provider_user_id, v_provider_uid
  FROM public.provider_professions pp
  JOIN public.users u ON u.id = pp.provider_user_id
  WHERE u.role = 'provider'
    AND u.supabase_uid IS NOT NULL
  ORDER BY pp.provider_user_id
  LIMIT 1;

  IF v_profession_id IS NULL OR v_provider_user_id IS NULL OR v_provider_uid IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: não encontrou prestador/profissão válidos.';
  END IF;

  -- Escolhe um cliente válido.
  SELECT u.id, u.supabase_uid
    INTO v_client_user_id, v_client_uid
  FROM public.users u
  WHERE u.role IN ('client', 'customer', 'passenger')
    AND u.supabase_uid IS NOT NULL
  ORDER BY u.id
  LIMIT 1;

  IF v_client_user_id IS NULL OR v_client_uid IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: não encontrou cliente válido (users.role client/customer/passenger).';
  END IF;

  -- Marca prestador escolhido como online e próximo do serviço de teste.
  UPDATE public.users
     SET last_seen_at = v_now,
         fcm_token = coalesce(fcm_token, 'e2e-fcm-token')
   WHERE id = v_provider_user_id;

  INSERT INTO public.provider_locations (provider_id, provider_uid, latitude, longitude, updated_at)
  VALUES (v_provider_user_id, v_provider_uid, -5.526390, -47.491670, v_now)
  ON CONFLICT (provider_id) DO UPDATE
    SET provider_uid = excluded.provider_uid,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = excluded.updated_at;

  -- Cria serviço novo com profession_id obrigatório para o teste.
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
    'E2E dispatch profession check',
    -5.526390,
    -47.491670,
    'E2E address',
    100.00,
    30.00,
    'searching',
    'paid',
    v_profession_id,
    'client',
    v_now
  )
  RETURNING id INTO v_service_id;

  RAISE NOTICE 'E2E service_id=% profession_id=% provider_user_id=%', v_service_id, v_profession_id, v_provider_user_id;
END $$;

-- Copie o service_id retornado acima e rode:
-- supabase functions invoke dispatch --no-verify-jwt \
--   --body '{"serviceId":"<SERVICE_ID>","action":"start_dispatch"}'

-- Validação 1: todas as linhas enfileiradas têm a mesma profession_id do serviço.
-- (troque <SERVICE_ID>)
-- SELECT
--   n.service_id,
--   sr.profession_id AS expected_profession_id,
--   COUNT(*) AS total_rows,
--   COUNT(*) FILTER (WHERE n.profession_id = sr.profession_id) AS matching_rows,
--   COUNT(*) FILTER (WHERE n.profession_id IS DISTINCT FROM sr.profession_id) AS mismatching_rows
-- FROM public.notificacao_de_servicos n
-- JOIN public.service_requests_new sr ON sr.id = n.service_id
-- WHERE n.service_id = '<SERVICE_ID>'::uuid
-- GROUP BY n.service_id, sr.profession_id;

-- Validação 2: inspeção detalhada da fila.
-- SELECT
--   n.id,
--   n.service_id,
--   n.provider_user_id,
--   n.profession_id,
--   n.distance,
--   n.status,
--   n.ciclo_atual,
--   n.queue_order,
--   n.last_notified_at
-- FROM public.notificacao_de_servicos n
-- WHERE n.service_id = '<SERVICE_ID>'::uuid
-- ORDER BY n.ciclo_atual, n.queue_order, n.id;

