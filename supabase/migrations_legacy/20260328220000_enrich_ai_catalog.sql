-- Enrich AI Catalog with colloquial terms to improve classification scores

-- 1. Ensure Jardinagem profession exists
-- NOTE: do not assume a fixed category_id exists on remote.
-- Use "Geral" (seeded as id=6 in our base data) when available; otherwise keep NULL.
INSERT INTO public.professions (name, service_type, category_id, icon)
SELECT
  'Jardineiro / Paisagista',
  'on_site',
  (SELECT id FROM public.service_categories WHERE name = 'Geral' ORDER BY id LIMIT 1),
  'flower'
WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE name = 'Jardineiro / Paisagista');

-- 2. Insert tasks for Jardinagem with rich colloquial keywords
DO $$
DECLARE
    v_prof_id bigint;
BEGIN
    SELECT id INTO v_prof_id FROM public.professions WHERE name = 'Jardineiro / Paisagista';

    -- Corte de Grama
    INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
    SELECT v_prof_id, 'Corte de grama / Aparar gramado', 'per_unit', 'm²', 5,
           'jardim; grama; mato; gramado; plantas; geiro; aparar; corta; roçagem; poeira; limpar; organizar',
           true
    WHERE NOT EXISTS (SELECT 1 FROM public.task_catalog WHERE profession_id = v_prof_id AND name = 'Corte de grama / Aparar gramado');

    -- Limpeza de Jardim
    INSERT INTO public.task_catalog (profession_id, name, pricing_type, unit_name, unit_price, keywords, active)
    SELECT v_prof_id, 'Limpeza de jardim / Roçagem geral', 'fixed', 'serviço', 150,
           'mato; limpeza; roçagem; geiro; matagal; desentulhar; entulho; jardinagem; terra; adubo; cuidar; arrumar',
           true
    WHERE NOT EXISTS (SELECT 1 FROM public.task_catalog WHERE profession_id = v_prof_id AND name = 'Limpeza de jardim / Roçagem geral');
END $$;

-- 3. Enrich existing task keywords with colloquial synonyms
-- These keywords will be picked up by the lexical search in ai-classify edge function

-- Cabeleireiro / Barbeiro context (meu cabelo ta muito feio, bagunçado, etc.)
UPDATE public.task_catalog
SET keywords = COALESCE(keywords, '') || ' feio; estragado; trato; arrumar; hidratar; tratar; bagunçado; careca; cresceu; cortar; consertar'
WHERE profession_id IN (SELECT id FROM public.professions WHERE name IN ('Cabeleireiro', 'Barbeiro'))
  AND keywords NOT LIKE '%feio%';

-- Chaveiro context (não sei onde deixei a chave, perdi a chave, etc.)
UPDATE public.task_catalog
SET keywords = COALESCE(keywords, '') || ' perdi; esqueci; trancada; preso; sumiu; chave; trancou; fora; carro; porta; cadeado'
WHERE profession_id IN (SELECT id FROM public.professions WHERE name = 'Chaveiro')
  AND keywords NOT LIKE '%perdi%';
