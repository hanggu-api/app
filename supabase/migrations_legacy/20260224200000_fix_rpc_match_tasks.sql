-- Replace RPC to remove service_type dependency

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
