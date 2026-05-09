-- Track commission due (cash or other off-platform payments)
ALTER TABLE public.driver_commission_summary
  ADD COLUMN IF NOT EXISTS total_commission_due NUMERIC(12,2) NOT NULL DEFAULT 0;
