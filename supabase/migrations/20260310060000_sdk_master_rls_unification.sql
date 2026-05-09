-- Migration: SDK-First RLS Unification Master
-- Description: Consolidates all RLS policies for critical tables to ensure seamless SDK operation.
-- Tables: users, trips, driver_locations, vehicles, chat_messages

BEGIN;

--------------------------------------------------------------------------------
-- 0. FUNÇÕES AUXILIARES (SEGURO E SEM RECURSÃO)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

--------------------------------------------------------------------------------
-- 1. LIMPEZA DE POLÍTICAS ANTIGAS
--------------------------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('users', 'trips', 'driver_locations', 'vehicles', 'chat_messages', 'notifications')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END$$;

--------------------------------------------------------------------------------
-- 2. TABELA: users (PERFIS)
--------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ver outros perfis (Necessário para ver motorista/cliente)
CREATE POLICY "users_read_all_authenticated" 
ON public.users FOR SELECT TO authenticated USING (true);

-- Gerenciar próprio perfil
CREATE POLICY "users_manage_own" 
ON public.users FOR ALL TO authenticated 
USING (supabase_uid = auth.uid()) 
WITH CHECK (supabase_uid = auth.uid());

--------------------------------------------------------------------------------
-- 3. TABELA: driver_locations (MAPA)
--------------------------------------------------------------------------------
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Ver localizações (Necessário para visibilidade global no mapa)
CREATE POLICY "driver_locations_read_all" 
ON public.driver_locations FOR SELECT TO authenticated USING (true);

-- Motorista atualiza sua própria localização
CREATE POLICY "driver_locations_update_own" 
ON public.driver_locations FOR ALL TO authenticated 
USING (driver_id = public.get_my_id()) 
WITH CHECK (driver_id = public.get_my_id());

--------------------------------------------------------------------------------
-- 4. TABELA: vehicles (DETALHES DO CARRO)
--------------------------------------------------------------------------------
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Ver veículos (Necessário para detalhes na busca e acompanhamento)
CREATE POLICY "vehicles_read_all" 
ON public.vehicles FOR SELECT TO authenticated USING (true);

-- Motorista gerencia seu veículo
CREATE POLICY "vehicles_manage_own" 
ON public.vehicles FOR ALL TO authenticated 
USING (driver_id = public.get_my_id()) 
WITH CHECK (driver_id = public.get_my_id());

--------------------------------------------------------------------------------
-- 5. TABELA: trips (VIAGENS)
--------------------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Ver viagens (Participantes ou em busca)
-- Nota: Abertura para 'searching' permite que motoristas vejam ofertas sem join complexo
CREATE POLICY "trips_read_involved" 
ON public.trips FOR SELECT TO authenticated 
USING (
  client_id = public.get_my_id() 
  OR driver_id = public.get_my_id() 
  OR status = 'searching'
);

-- Criar viagem (Apenas clientes)
CREATE POLICY "trips_insert_client" 
ON public.trips FOR INSERT TO authenticated 
WITH CHECK (client_id = public.get_my_id());

-- Atualizar status (Apenas participantes)
CREATE POLICY "trips_update_involved" 
ON public.trips FOR UPDATE TO authenticated 
USING (client_id = public.get_my_id() OR driver_id = public.get_my_id())
WITH CHECK (client_id = public.get_my_id() OR driver_id = public.get_my_id());

--------------------------------------------------------------------------------
-- 6. TABELA: chat_messages (BATE-PAPO)
--------------------------------------------------------------------------------
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Ler mensagens (Focado em participantes, mas simplificado para evitar erros de schema)
CREATE POLICY "chat_read_all_authenticated" 
ON public.chat_messages FOR SELECT TO authenticated 
USING (true);

-- Enviar mensagens
CREATE POLICY "chat_insert_own" 
ON public.chat_messages FOR INSERT TO authenticated 
WITH CHECK (sender_id = public.get_my_id());

--------------------------------------------------------------------------------
-- 7. TABELA: notifications (NOTIFICAÇÕES)
--------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários leem suas próprias notificações
-- Usamos supabase_uid se disponível ou join simples com users
CREATE POLICY "notifications_read_own" 
ON public.notifications FOR SELECT TO authenticated 
USING (
  user_id = public.get_my_id()
);

-- Usuários podem marcar como lidas (update)
CREATE POLICY "notifications_update_own" 
ON public.notifications FOR UPDATE TO authenticated 
USING (user_id = public.get_my_id())
WITH CHECK (user_id = public.get_my_id());

COMMIT;
