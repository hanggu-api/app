-- Tabelas para o Módulo Uber
CREATE TABLE IF NOT EXISTS vehicle_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    base_fare DECIMAL(10,2) DEFAULT 5.00,
    per_km_rate DECIMAL(10,2) DEFAULT 2.00,
    per_min_rate DECIMAL(10,2) DEFAULT 0.50,
    min_fare DECIMAL(10,2) DEFAULT 8.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO vehicle_types (id, name, display_name, base_fare, per_km_rate, per_min_rate, min_fare) VALUES
(1, 'uberx', 'Econômico', 5.00, 2.00, 0.50, 8.00),
(2, 'comfort', 'Conforto', 7.00, 2.50, 0.60, 12.00),
(3, 'moto', 'Moto', 3.00, 1.20, 0.30, 6.00)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id BIGINT REFERENCES users(id),
    driver_id BIGINT REFERENCES users(id),
    vehicle_type_id INTEGER REFERENCES vehicle_types(id),
    status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
    
    pickup_lat DECIMAL(10,8) NOT NULL,
    pickup_lon DECIMAL(11,8) NOT NULL,
    pickup_address TEXT,
    
    dropoff_lat DECIMAL(10,8) NOT NULL,
    dropoff_lon DECIMAL(11,8) NOT NULL,
    dropoff_address TEXT,
    
    fare_estimated DECIMAL(10,2),
    fare_final DECIMAL(10,2),
    
    polyline TEXT,
    distance_km DECIMAL(10,2),
    duration_min INTEGER,
    
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de tipos de veículos" ON vehicle_types FOR SELECT USING (true);
CREATE POLICY "Clientes podem ver suas viagens" ON trips FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = client_id));
CREATE POLICY "Motoristas podem ver suas viagens" ON trips FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = driver_id));
CREATE POLICY "Clientes podem criar viagens" ON trips FOR INSERT WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM users WHERE id = client_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
