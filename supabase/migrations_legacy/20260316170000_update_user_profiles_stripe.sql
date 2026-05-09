-- Migração para adicionar colunas de integração com Stripe na tabela consolidada
-- Data: 2026-03-16

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles_complete'
  ) THEN
    RAISE NOTICE 'Tabela public.user_profiles_complete inexistente; migration 20260316170000 ignorada.';
    RETURN;
  END IF;

  -- 1. Adicionar colunas de Stripe na tabela user_profiles_complete
  ALTER TABLE public.user_profiles_complete
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE;

  -- 2. Criar índices para performance
  CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
    ON public.user_profiles_complete(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account_id
    ON public.user_profiles_complete(stripe_account_id);

  -- 3. Comentários para documentação
  COMMENT ON COLUMN public.user_profiles_complete.stripe_customer_id
    IS 'ID do cliente no Stripe sincronizado.';
  COMMENT ON COLUMN public.user_profiles_complete.stripe_account_id
    IS 'ID da conta Connect no Stripe sincronizado.';

  -- 5. Função para sincronizar IDs do Stripe para user_profiles_complete
  CREATE OR REPLACE FUNCTION public.fn_sync_stripe_ids_to_profile()
  RETURNS TRIGGER AS $fn$
  BEGIN
    IF TG_TABLE_NAME = 'users' THEN
      UPDATE public.user_profiles_complete
      SET stripe_customer_id = NEW.stripe_customer_id
      WHERE user_id = NEW.id;
    ELSIF TG_TABLE_NAME = 'providers' THEN
      UPDATE public.user_profiles_complete
      SET stripe_account_id = NEW.stripe_account_id,
          stripe_onboarding_completed = NEW.stripe_onboarding_completed
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Gatilhos de sincronização
  DROP TRIGGER IF EXISTS tr_sync_stripe_customer_id ON public.users;
  CREATE TRIGGER tr_sync_stripe_customer_id
  AFTER UPDATE OF stripe_customer_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_stripe_ids_to_profile();

  DROP TRIGGER IF EXISTS tr_sync_stripe_account_id ON public.providers;
  CREATE TRIGGER tr_sync_stripe_account_id
  AFTER UPDATE OF stripe_account_id, stripe_onboarding_completed ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_stripe_ids_to_profile();
END
$$;
