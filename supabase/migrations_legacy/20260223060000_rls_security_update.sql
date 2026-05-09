-- Habilitar RLS para tabelas vulneráveis sem assumir que todas já existem
ALTER TABLE IF EXISTS public.app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notificacao_de_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'app_configs'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'app_configs'
          AND policyname = 'Public configs viewable by anyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Public configs viewable by anyone" ON public.app_configs FOR SELECT USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'service_categories'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'service_categories'
          AND policyname = 'Public categories viewable by anyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Public categories viewable by anyone" ON public.service_categories FOR SELECT USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'service_tasks'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'service_tasks'
          AND policyname = 'Public tasks viewable by anyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Public tasks viewable by anyone" ON public.service_tasks FOR SELECT USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'professions'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'professions'
          AND policyname = 'Public professions viewable by anyone'
    ) THEN
        EXECUTE 'CREATE POLICY "Public professions viewable by anyone" ON public.professions FOR SELECT USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'provider_locations'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'provider_locations'
          AND policyname = 'Authed can read provider locations'
    ) THEN
        EXECUTE 'CREATE POLICY "Authed can read provider locations" ON public.provider_locations FOR SELECT TO authenticated USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'provider_professions'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'provider_professions'
          AND policyname = 'Authed can read provider professions'
    ) THEN
        EXECUTE 'CREATE POLICY "Authed can read provider professions" ON public.provider_professions FOR SELECT TO authenticated USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'reviews'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Authed can read reviews'
    ) THEN
        EXECUTE 'CREATE POLICY "Authed can read reviews" ON public.reviews FOR SELECT TO authenticated USING (true)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'provider_locations'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'provider_locations'
          AND policyname = 'Providers can update own location'
    ) THEN
        EXECUTE 'CREATE POLICY "Providers can update own location" ON public.provider_locations FOR ALL TO authenticated USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id)) WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id))';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'provider_professions'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'provider_professions'
          AND policyname = 'Providers can update own professions'
    ) THEN
        EXECUTE 'CREATE POLICY "Providers can update own professions" ON public.provider_professions FOR ALL TO authenticated USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id)) WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id))';
    END IF;
END $$;
