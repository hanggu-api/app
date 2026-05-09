-- Permissões para prestador gerenciar seus próprios appointments (slots bloqueados/agendados)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'Providers can select own appointments'
  ) THEN
    CREATE POLICY "Providers can select own appointments"
    ON public.appointments
    FOR SELECT
    USING (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
      OR client_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'Providers can insert own appointments'
  ) THEN
    CREATE POLICY "Providers can insert own appointments"
    ON public.appointments
    FOR INSERT
    WITH CHECK (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'Providers can update own appointments'
  ) THEN
    CREATE POLICY "Providers can update own appointments"
    ON public.appointments
    FOR UPDATE
    USING (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    )
    WITH CHECK (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'appointments'
      AND policyname = 'Providers can delete own appointments'
  ) THEN
    CREATE POLICY "Providers can delete own appointments"
    ON public.appointments
    FOR DELETE
    USING (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;
END $$;
