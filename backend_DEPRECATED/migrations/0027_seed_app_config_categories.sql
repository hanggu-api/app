-- Migração: Seed initial values for Category Feature Flags in app_config
-- These flags control the visibility of specific categories on the mobile HomeScreen

INSERT OR IGNORE INTO app_config (key, value, type, description) VALUES 
('enable_packages', 'true', 'boolean', 'Habilita a categoria de entregas/pacotes na Home'),
('enable_reserve', 'true', 'boolean', 'Habilita a categoria de agendamento/reserva na Home');
