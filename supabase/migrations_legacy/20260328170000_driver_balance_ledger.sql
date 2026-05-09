-- Driver balance ledger: keep driver balance in its own table and update it from wallet_transactions
-- Goal: deleting a trip record must NOT change driver balances.

-- 1) Ensure wallet_transactions has the columns we rely on (safe idempotent)
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS trip_id uuid;

CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx
  ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_transactions_trip_idx
  ON public.wallet_transactions (trip_id);

-- Ensure trip_id does not cascade-delete ledger rows if trips are deleted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_transactions_trip_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_transactions
      DROP CONSTRAINT wallet_transactions_trip_id_fkey;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- local dev: table might not exist yet
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trips') THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_trip_id_fkey
      FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
END$$;

-- 2) Driver balances table (source of truth for driver's in-app balance)
CREATE TABLE IF NOT EXISTS public.driver_balances (
  user_id bigint PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_balance double precision NOT NULL DEFAULT 0,
  cash_in_hand_balance double precision NOT NULL DEFAULT 0,
  pix_platform_balance double precision NOT NULL DEFAULT 0,
  card_platform_balance double precision NOT NULL DEFAULT 0,
  total_debt_platform double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
