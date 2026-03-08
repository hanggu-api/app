-- Migração para corrigir sincronização de pagamento e segurança RLS
-- Data: 2026-03-06

-- 1. Tratar a coluna payment_method_id na tabela trips
DO $$
BEGIN
    -- Remove a restrição de chave estrangeira com CASCADE para garantir a limpeza total
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trips_payment_method_id_fkey' AND table_name = 'trips'
    ) THEN
        ALTER TABLE public.trips DROP CONSTRAINT trips_payment_method_id_fkey CASCADE;
    END IF;

    -- Se a coluna não existir, cria como TEXT
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'payment_method_id'
    ) THEN
        ALTER TABLE public.trips ADD COLUMN payment_method_id TEXT;
    ELSE
        -- Força a mudança de tipo para TEXT se houver incompatibilidade
        ALTER TABLE public.trips ALTER COLUMN payment_method_id TYPE TEXT;
    END IF;
END $$;

-- 2. Garantir que os métodos de pagamento básicos existam (Usando slugs como referência futura se necessário)
-- Primeiro, garantir que a tabela payment_methods tenha uma coluna ID serial e Slug unique
-- (Assumindo que a tabela já existe conforme o erro do usuário)
INSERT INTO public.payment_methods (id, name, slug, is_active) VALUES
(1, 'Dinheiro', 'money', true),
(2, 'Cartão na Máquina', 'card_machine', true),
(3, 'Pix', 'pix', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    is_active = EXCLUDED.is_active;

-- Adiciona novos métodos se necessário (Usando IDs altos para evitar conflito com sementes manuais)
INSERT INTO public.payment_methods (id, name, slug, is_active) VALUES
(4, 'Pix via App', 'pix_platform', true),
(5, 'Cartão via App', 'card_platform', true)
ON CONFLICT (id) DO NOTHING;


-- 3. Habilitar RLS e criar políticas
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_methods
DROP POLICY IF EXISTS "Leitura pública de métodos de pagamento" ON public.payment_methods;
CREATE POLICY "Leitura pública de métodos de pagamento" 
    ON public.payment_methods FOR SELECT 
    TO authenticated 
    USING (true);

-- Políticas para driver_payment_methods
DROP POLICY IF EXISTS "Leitura pública de preferências de pagamento" ON public.driver_payment_methods;
CREATE POLICY "Leitura pública de preferências de pagamento" 
    ON public.driver_payment_methods FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Motoristas gerenciam suas próprias preferências" ON public.driver_payment_methods;
CREATE POLICY "Motoristas gerenciam suas próprias preferências" 
    ON public.driver_payment_methods FOR ALL 
    TO authenticated 
    USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id))
    WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id));

-- 4. Comentários para documentação
COMMENT ON COLUMN public.trips.payment_method_id IS 'ID ou Slug do método de pagamento escolhido pelo passageiro';
