-- Compatibility migration: ensure public.professions has columns required by catalog seeds and search/IA.
-- Some older schemas only had (id, name, category_id).

ALTER TABLE public.professions
  ADD COLUMN IF NOT EXISTS keywords text,
  ADD COLUMN IF NOT EXISTS search_vector jsonb,
  ADD COLUMN IF NOT EXISTS popularity_score int DEFAULT 0;

