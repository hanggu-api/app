-- Migração para dados de treinamento da IA

CREATE TABLE IF NOT EXISTS public.task_training_data (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  task_id bigint REFERENCES public.task_catalog(id) ON DELETE CASCADE,
  phrase text NOT NULL,
  embedding vector(384),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_training_data ENABLE ROW LEVEL SECURITY;

-- Índice vetorial para a tabela de treinamento
CREATE INDEX IF NOT EXISTS task_training_embedding_idx ON public.task_training_data 
USING hnsw (embedding vector_cosine_ops);

-- Atualizar a função match_tasks para pesquisar em ambas as tabelas
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
  WITH all_matches AS (
    -- Busca no catálogo original
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
    
    UNION ALL
    
    -- Busca nas frases de treinamento
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
      1 - (td.embedding <=> query_embedding) AS similarity
    FROM public.task_training_data td
    JOIN public.task_catalog t ON t.id = td.task_id
    JOIN public.professions p ON p.id = t.profession_id
    WHERE t.active = true
  )
  SELECT DISTINCT ON (am.id)
    am.id,
    am.profession_id,
    am.task_name,
    am.unit_price,
    am.unit_name,
    am.pricing_type,
    am.service_type,
    am.profession_name,
    am.category_id,
    MAX(am.similarity) as similarity
  FROM all_matches am
  WHERE am.similarity > match_threshold
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, am.similarity
  ORDER BY am.id, similarity DESC;
  
  -- Wrap the above in a refined select to sort by final similarity
  -- but Distinct On needs order by id first. Let's simplify.
END;
$$;

-- Versão simplificada e correta da função refinada
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
    m.id, m.profession_id, m.task_name, m.unit_price, m.unit_name, 
    m.pricing_type, m.service_type, m.profession_name, m.category_id,
    MAX(m.similarity) as similarity
  FROM (
    SELECT
      t.id, t.profession_id, t.name as task_name, t.unit_price, t.unit_name,
      t.pricing_type, p.service_type, p.name as profession_name, p.category_id,
      1 - (t.embedding <=> query_embedding) AS similarity
    FROM public.task_catalog t
    JOIN public.professions p ON p.id = t.profession_id
    WHERE t.active = true
    
    UNION ALL
    
    SELECT
      t.id, t.profession_id, t.name as task_name, t.unit_price, t.unit_name,
      t.pricing_type, p.service_type, p.name as profession_name, p.category_id,
      1 - (td.embedding <=> query_embedding) AS similarity
    FROM public.task_training_data td
    JOIN public.task_catalog t ON t.id = td.task_id
    JOIN public.professions p ON p.id = t.profession_id
    WHERE t.active = true
  ) m
  WHERE m.similarity > match_threshold
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
