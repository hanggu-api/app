-- Migração: Adicionar coluna preferred_payment_method na tabela users
-- Garante que a preferência de pagamento do usuário seja persistida

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'PIX';

COMMENT ON COLUMN public.users.preferred_payment_method IS 'Meio de pagamento preferido. Valores: PIX, Dinheiro/Direto, Card_XXXX';
