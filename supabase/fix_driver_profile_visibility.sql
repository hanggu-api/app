-- Script para corrigir a leitura do perfil do motorista pelo cliente logado.
-- No momento o banco está travando a busca (retornando nulos) por causa do Row Level Security.

-- 1. Libera leitura na tabela de USERS para poder trazer o motorista.
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users for ride" ON public.users;

CREATE POLICY "Anyone can view users for ride" ON public.users
    FOR SELECT
    TO public
    USING (true);

-- 2. Libera leitura na tabela de VEHICLES para poder trazer o carro do motorista.
DROP POLICY IF EXISTS "Public can view vehicles" ON public.vehicles;

CREATE POLICY "Public can view vehicles" ON public.vehicles
    FOR SELECT
    TO public
    USING (true);
