
-- Migration: Fix Vehicles RLS and Clean Orphans
-- Description: Ensures all vehicles have valid drivers and resets RLS policies for vehicles table.

BEGIN;

-- 1. Limpeza de veículos órfãos (sem motorista correspondente em public.users)
DELETE FROM public.vehicles 
WHERE driver_id NOT IN (SELECT id FROM public.users);

-- 2. Limpeza de políticas antigas da tabela vehicles
DROP POLICY IF EXISTS "vehicles_read_all" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_manage_own" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers can manage own vehicle" ON public.vehicles;
DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;

-- 3. Recriar políticas de forma explícita e robusta
-- Permitir leitura para todos os autenticados (necessário para o mapa/perfil)
CREATE POLICY "vehicles_select_authenticated" 
ON public.vehicles FOR SELECT TO authenticated 
USING (true);

-- Permitir INSERT para o próprio motorista
CREATE POLICY "vehicles_insert_own" 
ON public.vehicles FOR INSERT TO authenticated 
WITH CHECK (driver_id = public.get_my_id());

-- Permitir UPDATE para o próprio motorista
CREATE POLICY "vehicles_update_own" 
ON public.vehicles FOR UPDATE TO authenticated 
USING (driver_id = public.get_my_id()) 
WITH CHECK (driver_id = public.get_my_id());

-- Permitir DELETE para o próprio motorista
CREATE POLICY "vehicles_delete_own" 
ON public.vehicles FOR DELETE TO authenticated 
USING (driver_id = public.get_my_id());

COMMIT;
