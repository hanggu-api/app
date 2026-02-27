-- Tabela de Configurações Dinâmicas do App
CREATE TABLE IF NOT EXISTS app_configs (
    key TEXT PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir valores padrão
INSERT INTO app_configs (key, value, description) VALUES
('enable_packages', 'false', 'Ativa/Desativa o módulo de pacotes'),
('enable_reserve', 'false', 'Ativa/Desativa o módulo de reservas'),
('search_radius_km', '50', 'Raio padrão de busca em KM')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de configurações" ON app_configs FOR SELECT USING (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_configs;
