-- Add wallet balance for clients (and any user) to support refundable deposits.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wallet_balance double precision NOT NULL DEFAULT 0;

