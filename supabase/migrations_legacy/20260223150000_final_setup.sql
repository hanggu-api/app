-- Migração Final: Configuração de Storage e Webhooks
-- Esta migração automatiza o que faltava para o sistema funcionar 100% no Supabase.

-- 1. Criando Buckets de Storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('service_media', 'service_media', true),
    ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- Garantindo políticas de acesso (Rls) para o Storage (todos podem ver, autenticados podem subir)
-- Nota: Em produção real, você restringiria quem pode subir. Para dev agora, facilitaremos.
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('service_media', 'chat_media'));
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('service_media', 'chat_media') AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id IN ('service_media', 'chat_media') AND auth.role() = 'authenticated');

-- 2. Habilitando Extensão pg_net para Webhooks (se não estiver)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Criando Webhook para Notificações Push
-- Toda vez que um status muda ou um serviço é inserido, avisamos a Edge Function.
CREATE OR REPLACE FUNCTION public.trigger_push_notifications()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://mroesvsmylnaxelrhqtl.supabase.co/functions/v1/push-notifications',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD),
        'table', TG_TABLE_NAME,
        'type', TG_OP
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparada em INSERT ou UPDATE na tabela de serviços
DROP TRIGGER IF EXISTS on_service_request_change ON service_requests_new;
CREATE TRIGGER on_service_request_change
  AFTER INSERT OR UPDATE ON service_requests_new
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notifications();

-- 4. Garantindo que a tabela de usuários tenha o campo fcm_token (já está no initial_schema, mas por garantia)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
