-- Marca pagamentos de simulação e registra trilha de auditoria de testes PIX

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_test_simulation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS simulation_source TEXT,
  ADD COLUMN IF NOT EXISTS simulated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS simulated_by TEXT;

CREATE TABLE IF NOT EXISTS public.payment_simulation_logs (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payment_id BIGINT NULL REFERENCES public.payments(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_sim_logs_trip_id
  ON public.payment_simulation_logs(trip_id);

CREATE INDEX IF NOT EXISTS idx_payment_sim_logs_created_at
  ON public.payment_simulation_logs(created_at DESC);

ALTER TABLE public.payment_simulation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage payment simulation logs" ON public.payment_simulation_logs;
CREATE POLICY "Service role manage payment simulation logs"
  ON public.payment_simulation_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
