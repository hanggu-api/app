-- Flags operacionais para controlar cadastro e pesquisa de prestadores.
-- Ajuste `value` para `true` ou `false` conforme a operação desejada.

alter table if exists public.app_configs
  add column if not exists category text not null default 'operational',
  add column if not exists platform_scope text not null default 'all',
  add column if not exists is_active boolean not null default true,
  add column if not exists revision integer not null default 1;

do $$
declare
  value_is_jsonb boolean := false;
begin
  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'app_configs'
      and c.column_name = 'value'
      and c.data_type = 'jsonb'
  ) into value_is_jsonb;

  if value_is_jsonb then
    update public.app_configs
    set value = to_jsonb(true),
        description = 'Ajuste para true/false. Controla se o cadastro de prestador fixo fica liberado no app.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.fixed.registration.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.fixed.registration.enabled',
        to_jsonb(true),
        'Ajuste para true/false. Controla se o cadastro de prestador fixo fica liberado no app.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = to_jsonb(true),
        description = 'Ajuste para true/false. Controla se o cadastro de prestador movel fica liberado no app.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.mobile.registration.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.mobile.registration.enabled',
        to_jsonb(true),
        'Ajuste para true/false. Controla se o cadastro de prestador movel fica liberado no app.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = to_jsonb(true),
        description = 'Ajuste para true/false. Controla se o prestador movel pode aparecer e buscar servicos.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.mobile.search.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.mobile.search.enabled',
        to_jsonb(true),
        'Ajuste para true/false. Controla se o prestador movel pode aparecer e buscar servicos.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = to_jsonb(true),
        description = 'Ajuste para true/false. Controla se o prestador fixo pode aparecer e buscar servicos.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.fixed.search.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.fixed.search.enabled',
        to_jsonb(true),
        'Ajuste para true/false. Controla se o prestador fixo pode aparecer e buscar servicos.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;
  else
    update public.app_configs
    set value = 'true',
        description = 'Ajuste para true/false. Controla se o cadastro de prestador fixo fica liberado no app.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.fixed.registration.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.fixed.registration.enabled',
        'true',
        'Ajuste para true/false. Controla se o cadastro de prestador fixo fica liberado no app.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = 'true',
        description = 'Ajuste para true/false. Controla se o cadastro de prestador movel fica liberado no app.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.mobile.registration.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.mobile.registration.enabled',
        'true',
        'Ajuste para true/false. Controla se o cadastro de prestador movel fica liberado no app.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = 'true',
        description = 'Ajuste para true/false. Controla se o prestador movel pode aparecer e buscar servicos.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.mobile.search.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.mobile.search.enabled',
        'true',
        'Ajuste para true/false. Controla se o prestador movel pode aparecer e buscar servicos.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;

    update public.app_configs
    set value = 'true',
        description = 'Ajuste para true/false. Controla se o prestador fixo pode aparecer e buscar servicos.',
        category = 'provider_access',
        platform_scope = 'all',
        is_active = true,
        revision = coalesce(revision, 1) + 1,
        updated_at = now()
    where key = 'provider.fixed.search.enabled'
      and coalesce(platform_scope, 'all') = 'all';

    if not found then
      insert into public.app_configs (key, value, description, category, platform_scope, is_active, revision)
      values (
        'provider.fixed.search.enabled',
        'true',
        'Ajuste para true/false. Controla se o prestador fixo pode aparecer e buscar servicos.',
        'provider_access',
        'all',
        true,
        1
      );
    end if;
  end if;
end $$;
