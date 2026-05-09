-- Criar tabela centralizada para contas de pagamento nos gateways
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    gateway_name TEXT NOT NULL, -- 'asaas', 'stripe', 'pagarme'
    external_id TEXT NOT NULL, -- ID do cliente no respectivo gateway
    wallet_id TEXT, -- Para gateways que usam wallets separadas (ex: Asaas)
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, gateway_name)
);

-- Habilitar RLS
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Usuário vê suas próprias contas)
DROP POLICY IF EXISTS "Users can view own payment accounts" ON public.payment_accounts;
CREATE POLICY "Users can view own payment accounts" ON public.payment_accounts FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = payment_accounts.user_id));

-- Inserir dados existentes (Migração de dados), com fallback quando colunas não existem.
DO $$
BEGIN
  -- Mover asaas_customer_id da tabela users para payment_accounts (quando disponível)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'asaas_customer_id'
  ) THEN
    INSERT INTO public.payment_accounts (user_id, gateway_name, external_id, wallet_id, status)
    SELECT id, 'asaas', asaas_customer_id, asaas_wallet_id, 'active'
    FROM public.users
    WHERE asaas_customer_id IS NOT NULL
    ON CONFLICT (user_id, gateway_name) DO NOTHING;
  END IF;

  -- Mover stripe_customer_id da tabela users para payment_accounts (quando disponível)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'stripe_customer_id'
  ) THEN
    INSERT INTO public.payment_accounts (user_id, gateway_name, external_id, status)
    SELECT id, 'stripe', stripe_customer_id, 'active'
    FROM public.users
    WHERE stripe_customer_id IS NOT NULL
    ON CONFLICT (user_id, gateway_name) DO NOTHING;
  END IF;
END
$$;
