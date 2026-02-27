-- Migration: Ensure driver role constraint and vehicles unique constraint
-- Garante que o role 'driver' é aceito e que cada motorista tem apenas um veículo

BEGIN;

-- 1. Remover constraint antiga de role (se existir) e recriar com 'driver'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('client', 'provider', 'driver', 'admin'));

-- 2. Garantir que driver_id é UNIQUE na tabela vehicles (um veículo por motorista)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_driver_id_key') THEN
        ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_driver_id_key UNIQUE (driver_id);
    END IF;
END $$;

-- 3. Garantir que plate é UNIQUE na tabela vehicles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_plate_key') THEN
        ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);
    END IF;
END $$;

-- 4. Atualizar o trigger handle_new_user para ler corretamente o role dos metadados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, email, full_name, role, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    NOW()
  )
  ON CONFLICT (supabase_uid) DO UPDATE SET
    role = COALESCE(EXCLUDED.role, public.users.role),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    email = COALESCE(EXCLUDED.email, public.users.email);
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- 5. Adicionar colunas de detalhes do veículo (cor, código hex da cor, ano)
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS color VARCHAR(30);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS color_hex BIGINT;
-- A coluna 'year' já deve existir da migration original, mas garantimos
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS year INTEGER;

-- 6. Adicionar colunas de status online do motorista
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 7. Criar tabela de localização do motorista (separada de provider_locations)
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_id INTEGER PRIMARY KEY REFERENCES public.users(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir que motoristas atualizem sua própria localização
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "driver_locations_all" ON public.driver_locations;
CREATE POLICY "driver_locations_all" ON public.driver_locations FOR ALL USING (true) WITH CHECK (true);
