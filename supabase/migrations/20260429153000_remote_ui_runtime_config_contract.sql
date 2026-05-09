alter table if exists public.app_configs
  add column if not exists category text not null default 'operational',
  add column if not exists platform_scope text not null default 'all',
  add column if not exists is_active boolean not null default true,
  add column if not exists revision integer not null default 1;

update public.app_configs
set category = coalesce(nullif(category, ''), 'operational'),
    platform_scope = coalesce(nullif(platform_scope, ''), 'all'),
    is_active = coalesce(is_active, true),
    revision = coalesce(revision, 1);

insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
values
  ('flag.remote_ui.enabled', 'true', 'Habilita renderização remota global', 'feature_flag', 'all', true, 1),
  ('flag.remote_ui.help.enabled', 'true', 'Habilita tela remota de ajuda', 'feature_flag', 'all', true, 1),
  ('flag.remote_ui.home_explore.enabled', 'true', 'Habilita tela remota de explore', 'feature_flag', 'all', true, 1),
  ('flag.remote_ui.driver_home.enabled', 'true', 'Habilita tela remota da home do prestador', 'feature_flag', 'all', true, 1),
  ('kill_switch.remote_ui.global', 'false', 'Kill switch global para telas remotas', 'kill_switch', 'all', true, 1),
  ('kill_switch.remote_ui.help', 'false', 'Kill switch da tela remota de ajuda', 'kill_switch', 'all', true, 1),
  ('kill_switch.remote_ui.home_explore', 'false', 'Kill switch da tela remota de explore', 'kill_switch', 'all', true, 1),
  ('kill_switch.remote_ui.driver_home', 'false', 'Kill switch da tela remota da home do prestador', 'kill_switch', 'all', true, 1),
  ('flag.runtime_diagnostics.visible', 'false', 'Exibe banner de diagnóstico de runtime', 'feature_flag', 'all', true, 1)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    category = excluded.category,
    platform_scope = excluded.platform_scope,
    is_active = excluded.is_active,
    revision = excluded.revision,
    updated_at = now();
