-- Armazena o ciclo de liquidação (especialmente cartão de crédito) por pagamento Asaas.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS billing_type TEXT,
  ADD COLUMN IF NOT EXISTS asaas_status TEXT,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT,
  ADD COLUMN IF NOT EXISTS estimated_credit_date DATE,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_payments_billing_type ON public.payments (billing_type);
CREATE INDEX IF NOT EXISTS idx_payments_settlement_status ON public.payments (settlement_status);
CREATE INDEX IF NOT EXISTS idx_payments_estimated_credit_date ON public.payments (estimated_credit_date);
