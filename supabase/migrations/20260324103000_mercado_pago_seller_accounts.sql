-- Migration: Criar tabela para contas Mercado Pago de motoristas (OAuth / Split)
CREATE TABLE IF NOT EXISTS public.driver_mercadopago_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    mp_user_id TEXT NOT NULL, -- ID da conta Mercado Pago do motorista
    access_token TEXT NOT NULL, -- Token para realizar operações em nome do motorista
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scope TEXT,
    live_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.driver_mercadopago_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- O motorista pode ver sua própria conta
DROP POLICY IF EXISTS "Drivers can view own MP account" ON public.driver_mercadopago_accounts;
CREATE POLICY "Drivers can view own MP account" 
ON public.driver_mercadopago_accounts 
FOR SELECT 
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_mercadopago_accounts.user_id));

-- Somente o sistema (service_role) pode gerenciar os tokens por segurança
-- Mas permitimos o delete pelo usuário caso ele queira desconectar
DROP POLICY IF EXISTS "Drivers can delete own MP account" ON public.driver_mercadopago_accounts;
CREATE POLICY "Drivers can delete own MP account" 
ON public.driver_mercadopago_accounts 
FOR DELETE 
USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_mercadopago_accounts.user_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_driver_mercadopago_accounts_updated_at
    BEFORE UPDATE ON public.driver_mercadopago_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentário para documentação
COMMENT ON TABLE public.driver_mercadopago_accounts IS 'Armazena credenciais OAuth de motoristas vinculados ao Marketplace Mercado Pago para Split Real.';
