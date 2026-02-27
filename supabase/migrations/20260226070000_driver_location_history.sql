-- Migration: Driver Location History and Trip Milestones
-- Description: Create tables for real-time location and historical tracking, and add milestone coordinates to trips.

BEGIN;

-- 1. Tabela para localização em tempo real (Upsert frequente)
CREATE TABLE IF NOT EXISTS public.driver_locations (
    driver_id INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT driver_locations_pkey PRIMARY KEY (driver_id),
    CONSTRAINT driver_locations_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users (id) ON DELETE CASCADE
);

-- 2. Tabela para histórico de movimentação (Longa data / Heatmaps)
CREATE TABLE IF NOT EXISTS public.driver_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id INTEGER NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT driver_location_history_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users (id) ON DELETE CASCADE
);

-- Index para facilitar busca por motorista e tempo
CREATE INDEX IF NOT EXISTS idx_driver_location_history_driver_time ON public.driver_location_history (driver_id, recorded_at);

-- 3. Novos campos na tabela 'trips' para capturar marcos geográficos
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS accepted_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS accepted_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS boarding_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS boarding_lon DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS actual_dropoff_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS actual_dropoff_lon DOUBLE PRECISION;

-- 4. RLS para as novas tabelas
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_location_history ENABLE ROW LEVEL SECURITY;

-- Políticas driver_locations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_locations' AND policyname = 'Leitura pública de localizações') THEN
        CREATE POLICY "Leitura pública de localizações" ON public.driver_locations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_locations' AND policyname = 'Motoristas atualizam sua própria localização') THEN
        CREATE POLICY "Motoristas atualizam sua própria localização" ON public.driver_locations FOR ALL USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id));
    END IF;
END $$;

-- Políticas driver_location_history
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_location_history' AND policyname = 'Apenas admins podem ver histórico completo') THEN
        CREATE POLICY "Apenas admins podem ver histórico completo" ON public.driver_location_history FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_location_history' AND policyname = 'Motoristas inserem seu próprio histórico') THEN
        CREATE POLICY "Motoristas inserem seu próprio histórico" ON public.driver_location_history FOR INSERT WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id));
    END IF;
END $$;

-- 5. Realtime
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'driver_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
    END IF;
END $$;

COMMIT;
