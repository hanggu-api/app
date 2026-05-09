-- Monitor de pagamentos com CARTAO (Asaas)
-- Uso: rode no SQL Editor do Supabase
-- Dica: altere os filtros no bloco "PARAMS"

-- =========================================================
-- PARAMS
-- =========================================================
-- Ajuste conforme necessidade:
-- 1) comentar/descomentar filtro por trip_id
-- 2) janela de tempo

-- =========================================================
-- 1) RESUMO EXECUTIVO (ultimas cobrancas cartao)
-- =========================================================
select
  p.id as payment_id,
  p.trip_id,
  t.client_id,
  t.driver_id,
  p.created_at,
  p.amount as total_amount,
  coalesce(p.commission_amount, 0) as platform_fee,
  (coalesce(p.amount, 0) - coalesce(p.commission_amount, 0)) as driver_net,
  p.status as local_status,
  to_jsonb(p)->>'asaas_status' as asaas_status,
  to_jsonb(p)->>'settlement_status' as settlement_status,
  to_jsonb(p)->>'billing_type' as billing_type,
  to_jsonb(p)->>'estimated_credit_date' as estimated_credit_date,
  to_jsonb(p)->>'received_at' as received_at,
  coalesce(to_jsonb(p)->>'asaas_payment_id', to_jsonb(p)->>'mp_payment_id') as gateway_payment_id
from public.payments p
left join public.trips t on t.id = p.trip_id
where upper(coalesce(to_jsonb(p)->>'billing_type', '')) = 'CREDIT_CARD'
  and p.created_at >= now() - interval '7 days'
  -- and p.trip_id = 'COLE_A_TRIP_ID_AQUI'
order by p.created_at desc
limit 50;

-- =========================================================
-- 2) LINHA DO TEMPO DOS EVENTOS (payment_transaction_logs)
-- =========================================================
select
  l.created_at,
  l.trace_id,
  l.trip_id,
  l.payment_id,
  l.asaas_payment_id,
  l.channel,
  l.event,
  l.status,
  l.billing_type,
  l.amount
from public.payment_transaction_logs l
where l.billing_type = 'CREDIT_CARD'
  and l.created_at >= now() - interval '7 days'
  -- and l.trip_id = 'COLE_A_TRIP_ID_AQUI'
order by l.created_at desc
limit 300;

-- =========================================================
-- 3) ALERTAS OPERACIONAIS
-- =========================================================
-- 3.1 Cartao pago, mas sem credito local para o motorista
select
  p.id as payment_id,
  p.trip_id,
  p.created_at,
  p.amount,
  p.commission_amount,
  p.status,
  to_jsonb(p)->>'asaas_status' as asaas_status,
  to_jsonb(p)->>'settlement_status' as settlement_status
from public.payments p
where upper(coalesce(to_jsonb(p)->>'billing_type', '')) = 'CREDIT_CARD'
  and lower(coalesce(p.status, '')) in ('paid', 'pending_settlement')
  and p.created_at >= now() - interval '7 days'
  and not exists (
    select 1
    from public.payment_transaction_logs l
    where l.payment_id = p.id
      and l.event = 'webhook_driver_balance_credited'
  )
order by p.created_at desc;

-- 3.2 Cobrancas antigas ainda pendentes de liquidacao
select
  p.id as payment_id,
  p.trip_id,
  p.created_at,
  p.amount,
  to_jsonb(p)->>'asaas_status' as asaas_status,
  to_jsonb(p)->>'settlement_status' as settlement_status,
  to_jsonb(p)->>'estimated_credit_date' as estimated_credit_date
from public.payments p
where upper(coalesce(to_jsonb(p)->>'billing_type', '')) = 'CREDIT_CARD'
  and lower(coalesce(to_jsonb(p)->>'settlement_status', 'pending')) in ('pending', 'pending_settlement', 'confirmed')
  and p.created_at < now() - interval '2 days'
order by p.created_at asc;

-- =========================================================
-- 4) DETALHE POR UMA TRIP (descomente e rode isolado)
-- =========================================================
-- select
--   p.*,
--   t.status as trip_status,
--   t.payment_status as trip_payment_status
-- from public.payments p
-- join public.trips t on t.id = p.trip_id
-- where p.trip_id = 'COLE_A_TRIP_ID_AQUI';

-- =========================================================
-- 5) DIAGNOSTICO TOKEN DE CARTAO (CARD_TOKEN_NOT_FOUND)
-- =========================================================
-- Objetivo: descobrir se a trip aponta para um metodo invalido
-- e se o cliente possui asaas_card_token salvo.
--
-- Passo 1: ajuste a trip_id abaixo e rode.
with target_trip as (
  select
    t.id as trip_id,
    t.client_id,
    t.driver_id,
    t.status as trip_status,
    t.payment_status as trip_payment_status,
    t.payment_method_id
  from public.trips t
  where t.id = '8d8f69df-aafa-4032-94a2-7c91584ecc7b'
)
select
  tt.trip_id,
  tt.client_id,
  tt.trip_status,
  tt.trip_payment_status,
  tt.payment_method_id as trip_payment_method_id,
  pm.id as saved_method_id,
  pm.is_default,
  pm.brand,
  pm.last4,
  pm.created_at as method_created_at,
  pm.asaas_card_token,
  pm.stripe_payment_method_id,
  pm.pagarme_card_id,
  case
    when pm.id::text = tt.payment_method_id then 'match:id'
    when coalesce(pm.asaas_card_token, '') = tt.payment_method_id then 'match:asaas_card_token'
    when coalesce(pm.stripe_payment_method_id, '') = tt.payment_method_id then 'match:stripe_payment_method_id'
    when coalesce(pm.pagarme_card_id, '') = tt.payment_method_id then 'match:pagarme_card_id'
    else 'no-match'
  end as match_type
from target_trip tt
left join public.user_payment_methods pm
  on pm.user_id = tt.client_id
order by pm.is_default desc, pm.created_at desc nulls last;

-- Passo 2: resumo rapido de consistencia do cliente da trip.
with target_trip as (
  select t.id as trip_id, t.client_id, t.payment_method_id
  from public.trips t
  where t.id = '8d8f69df-aafa-4032-94a2-7c91584ecc7b'
),
card_stats as (
  select
    pm.user_id,
    count(*) as total_saved_methods,
    count(*) filter (where coalesce(pm.asaas_card_token, '') <> '') as methods_with_asaas_token,
    count(*) filter (where pm.is_default = true and coalesce(pm.asaas_card_token, '') <> '') as default_with_asaas_token
  from public.user_payment_methods pm
  group by pm.user_id
)
select
  tt.trip_id,
  tt.client_id,
  tt.payment_method_id as trip_payment_method_id,
  coalesce(cs.total_saved_methods, 0) as total_saved_methods,
  coalesce(cs.methods_with_asaas_token, 0) as methods_with_asaas_token,
  coalesce(cs.default_with_asaas_token, 0) as default_with_asaas_token,
  case
    when coalesce(cs.methods_with_asaas_token, 0) = 0 then 'NO_ASAAS_TOKEN'
    when coalesce(cs.default_with_asaas_token, 0) = 0 then 'NO_DEFAULT_ASAAS_TOKEN'
    else 'OK_HAS_TOKEN'
  end as diagnostic
from target_trip tt
left join card_stats cs on cs.user_id = tt.client_id;
