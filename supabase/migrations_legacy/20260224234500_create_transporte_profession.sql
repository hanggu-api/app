-- Migration: Create Transporte profession
INSERT INTO public.professions (name, service_type, icon) 
VALUES ('Transporte', 'on_site', 'car')
ON CONFLICT (name) DO NOTHING;
