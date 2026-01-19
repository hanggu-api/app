-- Populating app_config with Dynamic Radius and Category Toggles

INSERT INTO app_config (key, value, type, description) 
VALUES 
    ('search_radius_km', '50.0', 'number', '     (em Quilômetros)'),
    ('enable_packages', 'false', 'boolean', 'Habilita o card (Pacotes) na Home Screen'),
    ('enable_reserve', 'false', 'boolean', 'Habilita o card (Reserva) na Home Screen')
ON CONFLICT(key) DO UPDATE SET 
    value = excluded.value, 
    type = excluded.type,
    description = excluded.description;
