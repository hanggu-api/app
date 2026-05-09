-- Migração para corrigir e expandir o provisionamento automático do Stripe
-- Data: 2026-03-12 12:00:00

-- 1. Garantir que a tabela app_config tenha o segredo interno para webhooks
-- Este segredo impede chamadas externas não autorizadas às Edge Functions
INSERT INTO public.app_config (key, value, type)
VALUES ('internal_webhook_secret', 'antigravity_secret_2026_safe', 'text')
ON CONFLICT (key) DO NOTHING;

-- 2. Atualizar a função de trigger para incluir o segredo e o nome da tabela
CREATE OR REPLACE FUNCTION public.fn_trigger_stripe_provisioning()
RETURNS TRIGGER AS $$
DECLARE
  project_ref TEXT;
  internal_secret TEXT;
  payload JSONB;
BEGIN
  -- Busca configurações
  SELECT value INTO project_ref FROM public.app_config WHERE key = 'supabase_project_ref';
  SELECT value INTO internal_secret FROM public.app_config WHERE key = 'internal_webhook_secret';
  
  -- Se o project_ref estiver vazio, tenta usar um valor padrão ou retorna
  IF project_ref IS NULL OR project_ref = 'SEU_REF_AQUI' THEN
    project_ref := 'mroesvsmylnaxelrhqtl'; -- Fallback para o ref detectado do projeto
  END IF;

  IF internal_secret IS NOT NULL THEN
    -- Constrói o payload com o registro e o nome da tabela
    payload := jsonb_build_object(
      'record', row_to_json(NEW),
      'table', TG_TABLE_NAME
    );

    -- Dispara o webhook de forma assíncrona via pg_net
    PERFORM
      net.http_post(
        url := 'https://' || project_ref || '.functions.supabase.co/stripe-onboarding-handler',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Internal-Secret', internal_secret
        ),
        body := payload
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para a tabela 'providers' (Motoristas/Prestadores)
-- Dispara em INSERT e UPDATE (se stripe_account_id for nulo)
DROP TRIGGER IF EXISTS tr_stripe_auto_onboarding ON public.providers;
CREATE TRIGGER tr_stripe_auto_onboarding
AFTER INSERT OR UPDATE OF stripe_account_id ON public.providers
FOR EACH ROW
WHEN (NEW.stripe_account_id IS NULL)
EXECUTE FUNCTION public.fn_trigger_stripe_provisioning();

-- 4. Trigger para a tabela 'users' (Clientes/Passageiros)
-- Dispara em INSERT e UPDATE (se stripe_customer_id for nulo)
DROP TRIGGER IF EXISTS tr_stripe_customer_auto_onboarding ON public.users;
CREATE TRIGGER tr_stripe_customer_auto_onboarding
AFTER INSERT OR UPDATE OF stripe_customer_id ON public.users
FOR EACH ROW
WHEN (NEW.stripe_customer_id IS NULL)
EXECUTE FUNCTION public.fn_trigger_stripe_provisioning();

COMMENT ON FUNCTION public.fn_trigger_stripe_provisioning() IS 'Trigger unificado para provisionamento de Stripe Customer e Account via Edge Function.';
