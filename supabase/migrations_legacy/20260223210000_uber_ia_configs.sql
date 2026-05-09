-- Adicionar chave uber_module_enabled na tabela app_configs
INSERT INTO app_configs (key, value, description) VALUES
('uber_module_enabled', 'true', 'Ativa/Desativa o módulo Uber para clientes'),
('ia_classify_enabled', 'true', 'Ativa/Desativa a classificação de serviços via IA')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
