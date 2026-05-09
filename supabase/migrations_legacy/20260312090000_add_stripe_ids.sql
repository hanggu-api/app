-- Migração para adicionar colunas de integração com Stripe
-- Permite split de pagamentos e onboarding de motoristas (Stripe Connect)

-- 1. Adicionar ID de cliente Stripe na tabela de usuários
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- 2. Adicionar ID de conta Stripe Connect na tabela de prestadores
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Adicionar ID do Payment Intent na tabela de pagamentos para rastreabilidade
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

-- 4. Comentários para documentação
COMMENT ON COLUMN users.stripe_customer_id IS 'ID do cliente no Stripe para pagamentos recorrentes e salvos.';
COMMENT ON COLUMN providers.stripe_account_id IS 'ID da conta Connect do prestador para recebimento de splits.';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'ID único da transação no Stripe.';
