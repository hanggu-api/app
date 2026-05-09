-- Garante que apenas uma oferta ativa por serviço possa existir ao mesmo tempo,
-- incluindo o intervalo entre push enviada e modal realmente apresentado.

with ranked_active as (
  select
    id,
    row_number() over (
      partition by service_id
      order by coalesce(response_deadline_at, last_notified_at, updated_at, created_at) desc, id desc
    ) as rn
  from public.notificacao_de_servicos
  where status in ('sending', 'notified')
)
update public.notificacao_de_servicos n
set
  status = 'retry_ready',
  response_deadline_at = null,
  skip_reason = coalesce(nullif(n.skip_reason, ''), 'migration_active_offer_dedup'),
  answered_at = coalesce(n.answered_at, now()),
  locked_at = null,
  locked_by_run = null,
  push_status = coalesce(nullif(n.push_status, ''), 'presentation_timeout')
from ranked_active r
where n.id = r.id
  and r.rn > 1;

drop index if exists public.ux_notificacao_one_notified_per_service;

create unique index if not exists ux_notificacao_one_active_offer_per_service
  on public.notificacao_de_servicos (service_id)
  where status in ('sending', 'notified');
