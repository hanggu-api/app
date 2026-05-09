-- Mercado Pago only - base schema adjustments

-- users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS driver_payment_mode TEXT DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS driver_daily_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_platform_tx_fee_rate NUMERIC(10,4) DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS mp_account_status TEXT,
  ADD COLUMN IF NOT EXISTS mp_collector_id TEXT;

-- payment_accounts
ALTER TABLE public.payment_accounts
  ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_connection_status TEXT,
  ADD COLUMN IF NOT EXISTS mp_metadata JSONB DEFAULT '{}'::jsonb;

-- user_payment_methods
ALTER TABLE public.user_payment_methods
  ADD COLUMN IF NOT EXISTS mp_card_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_method_id TEXT;

-- payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mercado_pago',
  ADD COLUMN IF NOT EXISTS external_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS settlement_category TEXT,
  ADD COLUMN IF NOT EXISTS settlement_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_status TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_external_payment_id ON public.payments(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_mp_card_id ON public.user_payment_methods(mp_card_id);

-- normalize existing gateway references to mercado_pago where missing
UPDATE public.payment_accounts
SET gateway_name = 'mercado_pago'
WHERE gateway_name IN ('mercadopago', 'mercado-pago');

