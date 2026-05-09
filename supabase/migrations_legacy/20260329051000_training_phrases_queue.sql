-- Queue for AI training phrases review/approval

create extension if not exists pgcrypto;

create table if not exists public.training_phrases_queue (
  id uuid primary key default gen_random_uuid(),
  task_id bigint not null references public.task_catalog(id) on delete cascade,
  phrase text not null,
  source text not null default 'cloudflare_llm',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  note text null
);

create index if not exists training_phrases_queue_task_id_idx on public.training_phrases_queue (task_id);
create index if not exists training_phrases_queue_status_idx on public.training_phrases_queue (status);
create index if not exists training_phrases_queue_created_at_idx on public.training_phrases_queue (created_at desc);

alter table public.training_phrases_queue enable row level security;

-- Only service role can modify; anyone authenticated can read their pending review page via admin-only APIs.
create policy "training queue readable by authenticated" on public.training_phrases_queue
for select to authenticated using (true);

-- Writes are restricted to service role (Edge Functions / admin server).
create policy "training queue writable by service_role" on public.training_phrases_queue
for all to service_role using (true) with check (true);

