
-- Migration: Add asaas_access_token to payment_accounts
-- Description: Stores the specific API access token for each driver's Asaas subaccount.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_accounts' 
        AND column_name = 'asaas_access_token'
    ) THEN
        ALTER TABLE public.payment_accounts ADD COLUMN asaas_access_token TEXT;
        COMMENT ON COLUMN public.payment_accounts.asaas_access_token IS 'Token de acesso à API do Asaas para esta subconta específica.';
    END IF;
END $$;

-- Update RLS if necessary (assuming it should only be accessible by service role or specific edge functions)
-- For now, we rely on the existing RLS of payment_accounts which should be restrictive.
