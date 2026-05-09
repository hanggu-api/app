-- Migration to add preferred_payment_method to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR DEFAULT 'PIX Direto';

-- Comment explaining the column
COMMENT ON COLUMN public.users.preferred_payment_method IS 'Saves the users favorite payment method to use as default in rides.';
