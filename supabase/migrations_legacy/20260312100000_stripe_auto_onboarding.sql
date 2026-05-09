-- Migração para auto-onboarding de prestadores na Stripe
-- Cria um gatilho que dispara um webhook para a Edge Function stripe-onboarding-handler

-- 1. Habilitar suporte para webhooks nos triggers (se necessário por segurança, dependendo da config do Supabase)
-- NOTA: O Supabase costuma usar pg_net para webhooks assíncronos

-- 2. Função que será chamada pelo Trigger para enviar o Webhook
CREATE OR REPLACE FUNCTION public.fn_trigger_stripe_auto_onboarding()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  service_key TEXT;
BEGIN
  -- Só dispara se stripe_account_id for nulo (evita loops e chamadas duplicadas)
  IF NEW.stripe_account_id IS NULL THEN
    
    -- Busca configs
    SELECT value INTO webhook_url FROM app_config WHERE key = 'supabase_project_ref';
    SELECT value INTO service_key FROM app_config WHERE key = 'service_role_key';
    
    IF webhook_url IS NOT NULL AND service_key IS NOT NULL THEN
      PERFORM
        net.http_post(
          url := 'https://' || webhook_url || '.functions.supabase.co/stripe-onboarding-handler',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
          ),
          body := jsonb_build_object('record', row_to_json(NEW))
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar o Trigger na tabela providers (Agora em INSERT e UPDATE)
DROP TRIGGER IF EXISTS tr_stripe_auto_onboarding ON providers;
CREATE TRIGGER tr_stripe_auto_onboarding
AFTER INSERT OR UPDATE ON providers
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_stripe_auto_onboarding();

-- 4. Inserir chaves de configuração no app_config se não existirem para facilitar a URL do webhook
-- Substitua pelos valores reais do seu projeto ou use as variáveis de ambiente padrão do Supabase
-- INSERT INTO app_config (key, value, type) VALUES ('supabase_project_ref', 'SEU_REF_AQUI', 'text') ON CONFLICT DO NOTHING;
-- INSERT INTO app_config (key, value, type) VALUES ('service_role_key', 'SUA_KEY_AQUI', 'text') ON CONFLICT DO NOTHING;

COMMENT ON TRIGGER tr_stripe_auto_onboarding ON providers IS 'Automatiza a criação de contas Stripe Connect para novos prestadores.';
