-- Migration: Update service_type and icon for fixed professions
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS service_type varchar(20) DEFAULT 'on_site' CHECK (service_type IN ('on_site', 'at_provider', 'remote'));
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS icon varchar(64);

UPDATE public.professions SET service_type = 'at_provider' WHERE name IN ('Barbeiro Masculino', 'Barbeiro', 'Mecânico', 'Borracheiro', 'Maquiadora', 'Pet Shop');
UPDATE public.professions SET service_type = 'on_site' WHERE name NOT IN ('Barbeiro Masculino', 'Barbeiro', 'Mecânico', 'Borracheiro', 'Maquiadora', 'Pet Shop');
