-- Proteção anti-duplicidade: no máximo 1 PIX pendente por serviço
-- Evita cobranças duplicadas em corridas de rede/retry simultâneo.

create unique index if not exists ux_payments_service_pending_pix
on public.payments (service_id)
where service_id is not null
  and lower(coalesce(provider, '')) = 'mercado_pago'
  and lower(coalesce(payment_method, payment_method_id, '')) in ('pix', 'pix_app')
  and lower(coalesce(status, '')) = 'pending';
