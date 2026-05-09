-- Migração para habilitar busca vetorial (IA Core)

-- 1. Habilitar a extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar coluna de embedding à tabela task_catalog
-- Usaremos 384 dimensões, que é o padrão para modelos leves como bge-small ou all-MiniLM-L6-v2
ALTER TABLE public.task_catalog 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 3. Criar a função de busca vetorial (RPC)
CREATE OR REPLACE FUNCTION public.match_tasks (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  profession_id bigint,
  task_name text,
  unit_price double precision,
  unit_name text,
  pricing_type text,
  service_type text,
  profession_name text,
  category_id bigint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.profession_id,
    t.name as task_name,
    t.unit_price,
    t.unit_name,
    t.pricing_type,
    p.service_type,
    p.name as profession_name,
    p.category_id,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.task_catalog t
  JOIN public.professions p ON p.id = t.profession_id
  WHERE t.active = true
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. Criar índice para acelerar a busca vetorial (IVFFLAT ou HNSW)
-- O HNSW é geralmente mais rápido e preciso para buscas menores
CREATE INDEX IF NOT EXISTS task_catalog_embedding_idx ON public.task_catalog 
USING hnsw (embedding vector_cosine_ops);
