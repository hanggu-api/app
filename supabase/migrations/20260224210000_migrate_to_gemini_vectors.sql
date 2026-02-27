-- 1. Drop existing indexes to modify the column
DROP INDEX IF EXISTS task_catalog_embedding_idx;
DROP INDEX IF EXISTS task_training_embedding_idx;

-- 2. Alter column type to 768 dimensions (Gemini text-embedding-004)
ALTER TABLE public.task_catalog ALTER COLUMN embedding TYPE vector(768) USING NULL;
ALTER TABLE public.task_training_data ALTER COLUMN embedding TYPE vector(768) USING NULL;

-- 3. Re-create the match_tasks function with 768 dimensions
DROP FUNCTION IF EXISTS public.match_tasks;

CREATE OR REPLACE FUNCTION public.match_tasks (
  query_embedding vector(768),
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
    'on_site'::text as service_type,
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

-- 4. Re-create the indexes
CREATE INDEX IF NOT EXISTS task_catalog_embedding_idx ON public.task_catalog USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS task_training_embedding_idx ON public.task_training_data USING hnsw (embedding vector_cosine_ops);
