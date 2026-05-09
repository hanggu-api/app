-- Trilhas ricas para auditoria de pagamentos (cartão/PIX) ponta a ponta

CREATE TABLE IF NOT EXISTS public.payment_transaction_logs (
  id BIGSERIAL PRIMARY KEY,
  trace_id TEXT,
  trip_id UUID NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payment_id BIGINT NULL REFERENCES public.payments(id) ON DELETE SET NULL,
  asaas_payment_id TEXT,
  provider TEXT NOT NULL DEFAULT 'asaas',
  channel TEXT NOT NULL DEFAULT 'edge',
  event TEXT NOT NULL,
  status TEXT,
  billing_type TEXT,
  amount NUMERIC(10, 2),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_logs_trace_id
  ON public.payment_transaction_logs(trace_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_logs_trip_id
  ON public.payment_transaction_logs(trip_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_logs_created_at
  ON public.payment_transaction_logs(created_at DESC);

ALTER TABLE public.payment_transaction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage payment tx logs" ON public.payment_transaction_logs;
CREATE POLICY "Service role manage payment tx logs"
  ON public.payment_transaction_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

