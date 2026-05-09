-- Migration: AI Learning System Implementation
-- Description: Adds tracking for processed logs and improves database documentation.

-- 1. Add 'integrated' column to ai_search_logs
ALTER TABLE public.ai_search_logs 
ADD COLUMN IF NOT EXISTS integrated boolean DEFAULT false;

-- 2. Add comments to AI related tables for better maintainability (PT-BR)
COMMENT ON TABLE public.task_catalog IS 'Catálogo principal de tarefas e serviços oferecidos pela plataforma.';
COMMENT ON COLUMN public.task_catalog.embedding IS 'Vetor de 768 dimensões gerado pelo Gemini para busca semântica.';
COMMENT ON COLUMN public.task_catalog.keywords IS 'Palavras-chave extras e metadados para busca lexical de fallback.';

COMMENT ON TABLE public.task_training_data IS 'Base de conhecimento incremental da IA, mapeando frases reais de usuários para tarefas.';
COMMENT ON COLUMN public.task_training_data.phrase IS 'Frase original digitada pelo usuário ou cadastrada pelo admin.';
COMMENT ON COLUMN public.task_training_data.embedding IS 'Vetor semântico da frase de treinamento (768-dim).';

COMMENT ON TABLE public.ai_search_logs IS 'Log de auditoria e fonte de aprendizado para o sistema de busca.';
COMMENT ON COLUMN public.ai_search_logs.user_query IS 'Texto exato buscado pelo usuário.';
COMMENT ON COLUMN public.ai_search_logs.selected_task_id IS 'ID da tarefa que o usuário realmente escolheu (prova de sucesso).';
COMMENT ON COLUMN public.ai_search_logs.success IS 'Indica se a busca resultou em uma conversão/agendamento.';
COMMENT ON COLUMN public.ai_search_logs.integrated IS 'Se este log já foi processado e transformado em dado de treinamento.';

-- 3. Create a view for search performance monitoring
CREATE OR REPLACE VIEW public.ai_search_metrics AS
SELECT 
    date_trunc('day', created_at) as day,
    count(*) as total_searches,
    count(*) FILTER (WHERE success = true) as successful_searches,
    round(count(*) FILTER (WHERE success = true)::numeric / count(*)::numeric * 100, 2) as conversion_rate
FROM public.ai_search_logs
GROUP BY 1
ORDER BY 1 DESC;

-- 4. Secure the new view
ALTER VIEW public.ai_search_metrics OWNER TO postgres;
GRANT SELECT ON public.ai_search_metrics TO authenticated;
GRANT SELECT ON public.ai_search_metrics TO service_role;
