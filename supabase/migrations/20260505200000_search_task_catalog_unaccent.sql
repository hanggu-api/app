-- Migration: Função de busca lexical no task_catalog com suporte a unaccent
-- Criada em: 2026-05-05

-- Habilita a extensão unaccent se não estiver ativa
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Remove versão anterior se existir
DROP FUNCTION IF EXISTS public.search_task_catalog(text, int);

-- Cria a função de busca com unaccent
CREATE OR REPLACE FUNCTION public.search_task_catalog(
  search_term text,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  id              bigint,
  name            text,
  unit_price      numeric,
  unit_name       text,
  pricing_type    text,
  profession_id   bigint,
  profession_name text,
  keywords        text,
  service_type    text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    tc.id,
    tc.name,
    tc.unit_price,
    tc.unit_name,
    tc.pricing_type,
    tc.profession_id,
    p.name AS profession_name,
    tc.keywords,
    tc.service_type
  FROM task_catalog tc
  LEFT JOIN professions p ON p.id = tc.profession_id
  WHERE
    tc.active = true
    AND (
      unaccent(tc.name)     ILIKE '%' || unaccent(search_term) || '%'
      OR unaccent(tc.keywords) ILIKE '%' || unaccent(search_term) || '%'
    )
  LIMIT result_limit;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.search_task_catalog(text, int) TO anon, authenticated, service_role;
