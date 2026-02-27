-- Populando categorias de serviço nativas
INSERT INTO public.service_categories (id, name) VALUES
(1, 'Encanamento'),
(2, 'Elétrica'),
(3, 'Pintura'),
(4, 'Marcenaria'),
(5, 'Manutenção'),
(6, 'Geral')
ON CONFLICT (id) DO NOTHING;

-- Populando configurações iniciais de aplicativo
INSERT INTO public.app_configs (key, value, description) VALUES
('enable_packages', 'false', 'Ativa/Desativa o módulo de pacotes'),
('enable_reserve', 'false', 'Ativa/Desativa o módulo de reservas'),
('search_radius_km', '60', 'Raio padrão de busca em KM')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
