create extension if not exists pgcrypto;

create table if not exists public.register_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  purpose text not null default 'provider_registration_liveness',
  status text not null default 'verified',
  auth_uid uuid null references auth.users(id) on delete set null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + interval '5 minutes'),
  consumed_at timestamp with time zone null,
  constraint register_sessions_status_check check (
    status = any (array['verified'::text, 'consumed'::text, 'expired'::text, 'revoked'::text])
  )
);

create index if not exists register_sessions_purpose_status_idx
  on public.register_sessions (purpose, status, expires_at desc);

create index if not exists register_sessions_auth_uid_idx
  on public.register_sessions (auth_uid, created_at desc);

alter table public.register_sessions enable row level security;

drop policy if exists "register_sessions_deny_all_select" on public.register_sessions;
create policy "register_sessions_deny_all_select"
on public.register_sessions
for select
to authenticated
using (false);
