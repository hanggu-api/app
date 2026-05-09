-- Ensure PIX fallback fields exist for Asaas payment reuse
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pix_payload TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
