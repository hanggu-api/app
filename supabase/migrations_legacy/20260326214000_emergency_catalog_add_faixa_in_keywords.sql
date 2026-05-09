-- Add an explicit "Faixa: R$ min-max" segment to emergency tasks keywords (no schema changes).
-- This keeps `task_catalog.unit_price` as the typical/median price, while exposing a typical range for UI/IA.

WITH target AS (
  SELECT
    t.id,
    t.keywords,
    t.unit_price
  FROM public.task_catalog t
  JOIN public.professions p ON p.id = t.profession_id
  WHERE p.name IN (
    'Chaveiro 24h (Residencial)',
    'Eletricista Plantão',
    'Encanador Plantão',
    'Desentupidora 24h',
    'Borracheiro 24h (Socorro)',
    'Guincho / Reboque 24h'
  )
    AND t.keywords ILIKE '%Atendimento:%24h%'
    AND t.keywords NOT ILIKE '%Faixa:%'
)
UPDATE public.task_catalog t
SET keywords = regexp_replace(
  t.keywords,
  '\s*\|\s*Atendimento:\s*24h',
  ' | Faixa: R$ ' ||
    (floor(target.unit_price * 0.80))::int ||
    '-' ||
    (ceil(target.unit_price * 1.30))::int ||
    ' | Atendimento: 24h',
  1,
  1
)
FROM target
WHERE t.id = target.id;
