begin;

alter table if exists public.service_requests
  add column if not exists schedule_client_rounds integer not null default 0,
  add column if not exists schedule_provider_rounds integer not null default 0;

update public.service_requests
set
  schedule_client_rounds = coalesce(schedule_client_rounds, 0),
  schedule_provider_rounds = coalesce(schedule_provider_rounds, 0),
  schedule_round = coalesce(schedule_round, 0)
where schedule_client_rounds is null
   or schedule_provider_rounds is null
   or schedule_round is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_client_rounds_non_negative'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_client_rounds_non_negative
      check (schedule_client_rounds >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_provider_rounds_non_negative'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_provider_rounds_non_negative
      check (schedule_provider_rounds >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_round_non_negative'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_round_non_negative
      check (coalesce(schedule_round, 0) >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_round_total_limit'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_round_total_limit
      check (coalesce(schedule_round, 0) <= 10);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_round_client_limit'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_round_client_limit
      check (coalesce(schedule_client_rounds, 0) <= 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_round_provider_limit'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_round_provider_limit
      check (coalesce(schedule_provider_rounds, 0) <= 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_service_requests_schedule_round_consistency'
  ) then
    alter table public.service_requests
      add constraint chk_service_requests_schedule_round_consistency
      check (
        coalesce(schedule_round, 0) =
        coalesce(schedule_client_rounds, 0) + coalesce(schedule_provider_rounds, 0)
      );
  end if;
end
$$;

commit;
