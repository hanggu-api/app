-- Migração: Adicionando colunas de compatibilidade na service_requests
-- Isso evita erros em gatilhos que esperam estes campos

ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_status character varying(20) DEFAULT 'pending';

-- Garantir que a coluna id (varchar) possa ser comparada com UUID sem erro em gatilhos
-- (O CAST explícito já foi adicionado nas funções, mas ter as colunas ajuda na consistência)
