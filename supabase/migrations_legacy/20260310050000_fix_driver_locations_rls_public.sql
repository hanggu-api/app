-- Migration: Fix driver_locations RLS to allow passengers to see available drivers
-- Description: Restores authenticated read access to driver_locations which was restricted to trip participants.

BEGIN;

-- 1. Remover políticas restritivas que impedem a visualização global
DROP POLICY IF EXISTS "Trip participants read realtime location" ON public.driver_locations;
DROP POLICY IF EXISTS "Leitura pública de localizações" ON public.driver_locations;

-- 2. Criar nova política permitindo que qualquer usuário autenticado veja motoristas online
-- Isso é necessário para que a Home Screen exiba os carros próximos
CREATE POLICY "Allow authenticated read access to driver_locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (true);

-- 3. Garantir que motoristas ainda possam gerenciar sua própria localização
-- (Caso a política anterior tenha sido removida ou precise de ajuste)
DROP POLICY IF EXISTS "Drivers manage own realtime location" ON public.driver_locations;
DROP POLICY IF EXISTS "Motoristas atualizam sua própria localização" ON public.driver_locations;

CREATE POLICY "Drivers manage own realtime location"
ON public.driver_locations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.id = driver_locations.driver_id
      AND me.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users me
    WHERE me.id = driver_locations.driver_id
      AND me.supabase_uid = auth.uid()
  )
);

COMMIT;
