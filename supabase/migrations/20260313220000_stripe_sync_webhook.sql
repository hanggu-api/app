-- Migration: Sincronização Bidirecional Supabase -> Stripe Marina! Marina! Marina!
-- Cria triggers de webhook no banco para notificar a Edge Function de atualizações e exclusões na tabela users

-- 1. Cria a função que dispara a chamada HTTP (pg_net)
-- Nota: Esta abordagem utiliza o pg_net (nativo do Supabase) para realizar a requisição HTTP.
CREATE OR REPLACE FUNCTION notify_stripe_customer_sync()
RETURNS trigger AS $$
DECLARE
  payload json;
  edge_function_url text;
  webhook_secret text;
BEGIN
  -- Substitua pela URL base do seu projeto se necessário, ou use a URL interna do kong
  -- Em ambiente de produção do Supabase, a chave de anon ou service_role deve ser enviada, mas para webhooks
  -- locais usando auth jwt, o ideal é usar o DB Webhooks UI.
  
  -- Aqui montamos o payload padrão do Supabase Webhooks
  payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', row_to_json(OLD)
  );

  -- NOTA IMPORTANTE:
  -- O recomendável no Supabase é utilizar a interface no painel (Database -> Webhooks)
  -- para criar esse Trigger, pois ele já gerencia a URL do pg_net e as chaves de forma segura.
  -- Esta migration serve como documentação de que o webhook precisa existir.

  -- Se for usar pg_net nativamente via SQL:
  -- PERFORM net.http_post(
  --     url:='https://<PROJECT_REF>.functions.supabase.co/stripe-customer-sync',
  --     body:=payload,
  --     headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <WEBHOOK_SECRET>')
  -- );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Cria o Trigger na tabela `users` após UPDATE
DROP TRIGGER IF EXISTS on_user_updated_sync_stripe ON users;
CREATE TRIGGER on_user_updated_sync_stripe
  AFTER UPDATE OF full_name, phone ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_stripe_customer_sync();

-- 3. Cria o Trigger na tabela `users` após DELETE
DROP TRIGGER IF EXISTS on_user_deleted_sync_stripe ON users;
CREATE TRIGGER on_user_deleted_sync_stripe
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_stripe_customer_sync();

-- ======================================================================================
-- AVISO: A configuração real do Webhook HTTP requer a extensão pg_net ou configuração
-- pelo painel do Supabase. Esta migration cria os gatilhos, mas idealmente, o Webhook 
-- deve ser configurado via painel para inserir as chaves de API secretas com segurança.
-- ======================================================================================
