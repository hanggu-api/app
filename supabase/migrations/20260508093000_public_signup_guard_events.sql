create extension if not exists pgcrypto;

create table if not exists public.public_signup_guard_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  ip_hash text not null,
  user_agent_hash text not null,
  origin_host text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_signup_guard_events_action_ip_created_idx
  on public.public_signup_guard_events (action, ip_hash, created_at desc);

create index if not exists public_signup_guard_events_created_idx
  on public.public_signup_guard_events (created_at desc);

alter table public.public_signup_guard_events enable row level security;

drop policy if exists "public_signup_guard_events_deny_all" on public.public_signup_guard_events;
create policy "public_signup_guard_events_deny_all"
on public.public_signup_guard_events
for all
to authenticated
using (false)
with check (false);
