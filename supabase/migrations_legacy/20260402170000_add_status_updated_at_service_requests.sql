-- Fix: some app flows update service_requests_new.status_updated_at but the column may be missing.
ALTER TABLE public.service_requests_new
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

