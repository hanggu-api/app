-- Habilitando RLS para todas as tabelas listadas
alter table public.wallet_transactions enable row level security;
alter table public.service_categories enable row level security;
alter table public.professions enable row level security;
alter table public.provider_professions enable row level security;
alter table public.task_catalog enable row level security;
alter table public.service_tasks enable row level security;
alter table public.notification_registry enable row level security;
alter table public.notificacao_de_servicos enable row level security;
alter table public.payments enable row level security;
alter table public.app_config enable row level security;
alter table public.provider_locations enable row level security;

-- Criando políticas básicas de leitura para usuários autenticados (Ajuste conforme suas necessidades de inserção/atualização)
create policy "Allow authenticated read access" on public.wallet_transactions for select to authenticated using (true);
create policy "Allow authenticated read access" on public.service_categories for select to authenticated using (true);
create policy "Allow authenticated read access" on public.professions for select to authenticated using (true);
create policy "Allow authenticated read access" on public.provider_professions for select to authenticated using (true);
create policy "Allow authenticated read access" on public.task_catalog for select to authenticated using (true);
create policy "Allow authenticated read access" on public.service_tasks for select to authenticated using (true);
create policy "Allow authenticated read access" on public.notification_registry for select to authenticated using (true);
create policy "Allow authenticated read access" on public.notificacao_de_servicos for select to authenticated using (true);
create policy "Allow authenticated read access" on public.payments for select to authenticated using (true);
create policy "Allow authenticated read access" on public.app_config for select to authenticated using (true);
create policy "Allow authenticated read access" on public.provider_locations for select to authenticated using (true);
