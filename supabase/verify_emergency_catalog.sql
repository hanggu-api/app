-- Verification queries for the "Socorro / Emergência (MA/TO/PA)" catalog seed.
-- Run against your Supabase DB (local or remote) after applying migrations.

-- 1) Professions + number of active tasks (should be >= 20 each)
SELECT
  p.name,
  p.service_type,
  p.popularity_score,
  COUNT(t.id) FILTER (WHERE t.active) AS active_tasks
FROM public.professions p
LEFT JOIN public.task_catalog t ON t.profession_id = p.id
WHERE p.name IN (
  'Chaveiro 24h (Residencial)',
  'Eletricista Plantão',
  'Encanador Plantão',
  'Desentupidora 24h',
  'Borracheiro 24h (Socorro)',
  'Guincho / Reboque 24h'
)
GROUP BY p.name, p.service_type, p.popularity_score
ORDER BY p.name;

-- 2) Ensure tasks embed "24h" semantics in keywords (no schema changes)
SELECT
  p.name,
  COUNT(t.id) AS total_tasks,
  COUNT(t.id) FILTER (WHERE t.keywords ILIKE '%Atendimento: 24h%') AS tasks_marked_24h
FROM public.professions p
JOIN public.task_catalog t ON t.profession_id = p.id
WHERE p.name IN (
  'Chaveiro 24h (Residencial)',
  'Eletricista Plantão',
  'Encanador Plantão',
  'Desentupidora 24h',
  'Borracheiro 24h (Socorro)',
  'Guincho / Reboque 24h'
)
GROUP BY p.name
ORDER BY p.name;

-- 2.1) Ensure "Faixa" was added (range derived from unit_price)
SELECT
  p.name,
  COUNT(t.id) AS total_tasks,
  COUNT(t.id) FILTER (WHERE t.keywords ILIKE '%Faixa:%') AS tasks_with_faixa
FROM public.professions p
JOIN public.task_catalog t ON t.profession_id = p.id
WHERE p.name IN (
  'Chaveiro 24h (Residencial)',
  'Eletricista Plantão',
  'Encanador Plantão',
  'Desentupidora 24h',
  'Borracheiro 24h (Socorro)',
  'Guincho / Reboque 24h'
)
GROUP BY p.name
ORDER BY p.name;

-- 3) Spot check: tasks for a given profession (edit the name as needed)
SELECT
  t.id,
  t.name,
  t.pricing_type,
  t.unit_name,
  t.unit_price,
  t.active,
  t.keywords
FROM public.task_catalog t
JOIN public.professions p ON p.id = t.profession_id
WHERE p.name = 'Borracheiro 24h (Socorro)'
ORDER BY t.id ASC
LIMIT 50;
