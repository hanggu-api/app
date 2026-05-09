-- E2E: dispute resolution workflow
-- Objetivo: validar os 3 cenarios criticos do fluxo de disputa:
-- 1) pending/open -> rejected/dismissed: deve liberar credito do prestador
-- 2) pending/open -> accepted/resolved: deve reembolsar 90% ao cliente e nao creditar prestador
-- 3) redecisao tardia: deve falhar ao tentar trocar o status apos sair de open
--
-- Como usar:
-- 1) Rode este SQL em local/staging.
-- 2) Leia os NOTICEs para obter os service_ids criados.
-- 3) Rode as queries finais de validacao para cada service_id.
-- Observacao: o caso "dismissed" precisa nascer em um status aceito pela
-- rpc_auto_confirm_service_after_grace: 'awaiting_confirmation' ou
-- 'waiting_client_confirmation'.

DO $$
DECLARE
  v_provider_user_id bigint;
  v_provider_uid uuid;
  v_client_user_id bigint;
  v_client_uid uuid;
  v_profession_id bigint;
  v_category_id bigint;
  v_service_dismissed uuid;
  v_service_resolved uuid;
  v_dispute_dismissed_id bigint;
  v_dispute_resolved_id bigint;
  v_now timestamptz := now();
BEGIN
  SELECT pp.provider_user_id, u.supabase_uid, pp.profession_id
    INTO v_provider_user_id, v_provider_uid, v_profession_id
  FROM public.provider_professions pp
  JOIN public.users u ON u.id = pp.provider_user_id
  WHERE u.role = 'provider'
    AND u.supabase_uid IS NOT NULL
  ORDER BY pp.provider_user_id
  LIMIT 1;

  IF v_provider_user_id IS NULL OR v_profession_id IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: nenhum prestador com profissao foi encontrado.';
  END IF;

  SELECT category_id
    INTO v_category_id
  FROM public.professions
  WHERE id = v_profession_id
  LIMIT 1;

  SELECT u.id, u.supabase_uid
    INTO v_client_user_id, v_client_uid
  FROM public.users u
  WHERE u.role IN ('client', 'customer', 'passenger')
    AND u.supabase_uid IS NOT NULL
  ORDER BY u.id
  LIMIT 1;

  IF v_client_user_id IS NULL OR v_client_uid IS NULL THEN
    RAISE EXCEPTION 'E2E abortado: nenhum cliente valido foi encontrado.';
  END IF;

  INSERT INTO public.service_requests_new (
    client_id,
    client_uid,
    provider_id,
    provider_uid,
    category_id,
    profession_id,
    description,
    latitude,
    longitude,
    address,
    price_estimated,
    price_upfront,
    status,
    payment_status,
    status_updated_at,
    location_type,
    created_at
  )
  VALUES (
    v_client_user_id,
    v_client_uid,
    v_provider_user_id,
    v_provider_uid,
    v_category_id,
    v_profession_id,
    'E2E dispute dismissed',
    -5.526390,
    -47.491670,
    'E2E dispute dismissed address',
    100.00,
    100.00,
    'awaiting_confirmation',
    'paid',
    v_now - interval '2 hours',
    'client',
    v_now
  )
  RETURNING id INTO v_service_dismissed;

  INSERT INTO public.service_disputes (
    service_id,
    user_id,
    type,
    reason,
    status,
    created_at
  )
  VALUES (
    v_service_dismissed,
    v_client_user_id,
    'text',
    'E2E dismissed dispute',
    'open',
    v_now
  )
  RETURNING id INTO v_dispute_dismissed_id;

  UPDATE public.service_disputes
  SET platform_decision = 'rejected'
  WHERE id = v_dispute_dismissed_id;

  INSERT INTO public.service_requests_new (
    client_id,
    client_uid,
    provider_id,
    provider_uid,
    category_id,
    profession_id,
    description,
    latitude,
    longitude,
    address,
    price_estimated,
    price_upfront,
    status,
    payment_status,
    status_updated_at,
    location_type,
    created_at
  )
  VALUES (
    v_client_user_id,
    v_client_uid,
    v_provider_user_id,
    v_provider_uid,
    v_category_id,
    v_profession_id,
    'E2E dispute resolved',
    -5.526390,
    -47.491670,
    'E2E dispute resolved address',
    100.00,
    100.00,
    'finished',
    'paid',
    v_now - interval '2 hours',
    'client',
    v_now
  )
  RETURNING id INTO v_service_resolved;

  INSERT INTO public.service_disputes (
    service_id,
    user_id,
    type,
    reason,
    status,
    created_at
  )
  VALUES (
    v_service_resolved,
    v_client_user_id,
    'text',
    'E2E resolved dispute',
    'open',
    v_now
  )
  RETURNING id INTO v_dispute_resolved_id;

  UPDATE public.service_disputes
  SET platform_decision = 'accepted'
  WHERE id = v_dispute_resolved_id;

  RAISE NOTICE 'dismissed_service_id=% dismissed_dispute_id=%', v_service_dismissed, v_dispute_dismissed_id;
  RAISE NOTICE 'resolved_service_id=% resolved_dispute_id=%', v_service_resolved, v_dispute_resolved_id;
  RAISE NOTICE 'Agora teste a redecisao tardia manualmente com:';
  RAISE NOTICE 'UPDATE public.service_disputes SET platform_decision = ''accepted'' WHERE id = %;', v_dispute_dismissed_id;
  RAISE NOTICE 'UPDATE public.service_disputes SET platform_decision = ''rejected'' WHERE id = %;', v_dispute_resolved_id;
END $$;

-- Validacao 1: dismissed deve concluir o servico e creditar 85% ao prestador.
-- Troque <SERVICE_ID_DISMISSED>.
-- SELECT
--   s.id,
--   s.status,
--   s.provider_amount,
--   s.completed_at,
--   s.finished_at,
--   wt.user_id,
--   wt.type,
--   wt.amount,
--   wt.description
-- FROM public.service_requests_new s
-- LEFT JOIN public.wallet_transactions wt
--   ON wt.service_id = s.id
--  AND wt.type = 'credit'
-- WHERE s.id = '<SERVICE_ID_DISMISSED>'::uuid;

-- Validacao 2: resolved deve marcar refunded, refund 90% e zero credito ao prestador.
-- Troque <SERVICE_ID_RESOLVED>.
-- SELECT
--   s.id,
--   s.status,
--   s.provider_amount,
--   s.completed_at,
--   s.finished_at,
--   wt.user_id,
--   wt.type,
--   wt.amount,
--   wt.description
-- FROM public.service_requests_new s
-- LEFT JOIN public.wallet_transactions wt
--   ON wt.service_id = s.id
-- WHERE s.id = '<SERVICE_ID_RESOLVED>'::uuid
-- ORDER BY wt.created_at, wt.type;

-- Validacao 3: saldos apos os fluxos.
-- Troque os ids conforme necessario.
-- SELECT id, wallet_balance
-- FROM public.users
-- WHERE id IN (<CLIENT_USER_ID>, <PROVIDER_USER_ID>);
