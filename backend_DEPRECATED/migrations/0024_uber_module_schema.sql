-- Migration: Bootstrap Uber-like Module
-- Created at: 2026-02-20

-- 0. Garantir colunas em app_config (Caso o bootstrap inicial tenha falhado as colunas extras)
-- SQLite não suporta IF NOT EXISTS em ALTER TABLE diretamente de forma simples, 
-- mas podemos tentar adicionar e ignorar erros ou fazer de forma segura.
-- Como D1 pode falhar o script todo se um comando falhar, vamos remover 'description' do insert por enquanto
-- ou adicionar a coluna antes.

-- Tentar adicionar colunas se não existirem (D1 ignora se já existirem em alguns contextos, mas no script pode dar erro)
-- Vou ajustar o INSERT para usar apenas as colunas que confirmamos que existem.

-- 1. Tipos de Veículo
CREATE TABLE IF NOT EXISTS vehicle_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,              -- 'uberx', 'comfort', 'moto'
    display_name TEXT NOT NULL,      -- 'Econômico', 'Conforto', 'Moto'
    icon_url TEXT,
    base_fare REAL NOT NULL,         -- Tarifa base
    per_km_rate REAL NOT NULL,       -- Por km
    per_min_rate REAL NOT NULL,      -- Por minuto
    min_fare REAL NOT NULL,          -- Tarifa mínima
    capacity INTEGER DEFAULT 4,      -- Capacidade passageiros
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Viagens
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,             -- UUID
    client_id INTEGER NOT NULL,
    driver_id INTEGER,               -- NULL até aceitar
    vehicle_type_id INTEGER,
    
    -- Localização
    pickup_latitude REAL NOT NULL,
    pickup_longitude REAL NOT NULL,
    pickup_address TEXT,
    dropoff_latitude REAL NOT NULL,
    dropoff_longitude REAL NOT NULL,
    dropoff_address TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'searching',
    -- searching, driver_found, driver_en_route, arrived, in_progress, completed, cancelled
    
    -- Preço
    estimated_fare REAL,
    final_fare REAL,
    distance_km REAL,
    duration_minutes INTEGER,
    
    -- Timestamps
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    arrived_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,
    
    -- Cancelamento
    cancelled_by TEXT,               -- 'client' ou 'driver'
    cancellation_fee REAL DEFAULT 0,
    
    -- Segurança
    sos_triggered INTEGER DEFAULT 0,
    shared_trip_token TEXT,          -- Para compartilhar viagem
    
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
);

-- 3. Rastreamento
CREATE TABLE IF NOT EXISTS trip_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    driver_latitude REAL NOT NULL,
    driver_longitude REAL NOT NULL,
    speed REAL,
    heading INTEGER,
    accuracy REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);

-- 4. Disponibilidade do Motorista
CREATE TABLE IF NOT EXISTS driver_availability (
    driver_id INTEGER PRIMARY KEY,
    is_online INTEGER DEFAULT 0,
    current_latitude REAL,
    current_longitude REAL,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepting_rides INTEGER DEFAULT 1,
    
    FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- 5. Configurações e Feature Flags (Apenas colunas confirmadas: key, value, type)
INSERT OR IGNORE INTO app_config (key, value, type) VALUES
('uber_module_enabled', 'false', 'boolean'),
('uber_vehicle_types', '["uberx","comfort","moto"]', 'json'),
('uber_base_fare', '5.00', 'number'),
('uber_per_km_rate', '2.50', 'number'),
('uber_per_min_rate', '0.50', 'number'),
('uber_cancel_fee_after_seconds', '120', 'number'),
('uber_max_search_radius_km', '10', 'number'),
('uber_surge_enabled', 'false', 'boolean');

-- 6. Seed Tipos de Veículo Iniciais
INSERT INTO vehicle_types (name, display_name, base_fare, per_km_rate, per_min_rate, min_fare, capacity) VALUES
('uberx', 'Econômico', 5.00, 2.50, 0.50, 8.00, 4),
('comfort', 'Conforto', 7.00, 3.20, 0.70, 12.00, 4),
('moto', 'Moto', 3.00, 1.50, 0.30, 5.00, 1);
