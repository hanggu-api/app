-- Fix profession service_type for mobile roadside services.
-- Borracheiro/Mecânico/Guincheiro should be on-site (provider goes to client), not at_provider.

UPDATE public.professions
SET service_type = 'on_site'
WHERE lower(name) IN (
  'borracheiro',
  'mecânico',
  'mecanico',
  'guincheiro',
  'mecânico (serviços rápidos)',
  'mecanico (serviços rápidos)'
);
