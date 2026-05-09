-- Frontend contract hardening (mobile_app)
-- Goal: reduce/remove runtime fallback paths in frontend by guaranteeing expected columns.

alter table if exists public.users
  add column if not exists updated_at timestamptz,
  add column if not exists sub_role text,
  add column if not exists is_fixed_location boolean default false,
  add column if not exists birth_date date,
  add column if not exists document_value text,
  add column if not exists document_type text,
  add column if not exists preferred_payment_method bigint,
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists supabase_uid uuid;

alter table if exists public.professions
  add column if not exists icon text,
  add column if not exists category_id bigint,
  add column if not exists service_type text;

alter table if exists public.provider_schedules
  add column if not exists provider_uid uuid,
  add column if not exists break_start time,
  add column if not exists break_end time,
  add column if not exists slot_duration integer default 30,
  add column if not exists is_enabled boolean default true;

alter table if exists public.fixed_booking_pix_intents
  add column if not exists updated_at timestamptz,
  add column if not exists created_service_id uuid;

alter table if exists public.fixed_booking_slot_holds
  add column if not exists duration_minutes integer,
  add column if not exists updated_at timestamptz;

alter table if exists public.agendamento_servico
  add column if not exists completion_code text,
  add column if not exists verification_code text,
  add column if not exists proof_code text,
  add column if not exists codigo_validacao text,
  add column if not exists proof_video text,
  add column if not exists proof_photo text,
  add column if not exists completed_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists client_departing_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists client_arrived boolean default false,
  add column if not exists client_latitude double precision,
  add column if not exists client_longitude double precision,
  add column if not exists client_tracking_active boolean default false,
  add column if not exists client_tracking_status text,
  add column if not exists client_tracking_source text,
  add column if not exists client_tracking_updated_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.service_requests_new
  add column if not exists profession_id bigint,
  add column if not exists location_type text,
  add column if not exists fee_admin_rate numeric,
  add column if not exists fee_admin_amount numeric,
  add column if not exists amount_payable_on_site numeric,
  add column if not exists task_id bigint,
  add column if not exists updated_at timestamptz;

do $$
begin
  if to_regclass('public.users') is not null then
    create index if not exists idx_users_supabase_uid on public.users(supabase_uid);
  end if;

  if to_regclass('public.provider_schedules') is not null then
    create index if not exists idx_provider_schedules_provider_id on public.provider_schedules(provider_id);
  end if;

  if to_regclass('public.fixed_booking_slot_holds') is not null then
    create index if not exists idx_fixed_booking_slot_holds_intent on public.fixed_booking_slot_holds(pix_intent_id);
  end if;

  if to_regclass('public.service_requests_new') is not null then
    create index if not exists idx_service_requests_new_client_status on public.service_requests_new(client_id, status);
  end if;

  if to_regclass('public.agendamento_servico') is not null then
    create index if not exists idx_agendamento_servico_status on public.agendamento_servico(status);
  end if;
end $$;
