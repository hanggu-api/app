-- Reconfiguracao do despacho sequencial: permitir 3 ciclos por prestador em round-robin.

-- 1. Atualizar o padrao da coluna para 3
ALTER TABLE public.notificacao_de_servicos 
  ALTER COLUMN max_attempts SET DEFAULT 3;

-- 2. Corrigir registros existentes para 3 tentativas por prestador
UPDATE public.notificacao_de_servicos
SET max_attempts = 3
WHERE max_attempts IS DISTINCT FROM 3;

-- 3. Preservar estados retry_ready para permitir novos ciclos planejados
-- Nenhuma conversao forcada para timeout_exhausted deve ocorrer aqui.

-- 4. Log da mudança
INSERT INTO public.service_logs (service_id, action, details)
VALUES (
  NULL, 
  'SYSTEM_DISPATCH_RECONFIGURED', 
  '{"message":"Configuracao de despacho alterada para 3 ciclos por prestador (max_attempts=3)"}'::jsonb
);
