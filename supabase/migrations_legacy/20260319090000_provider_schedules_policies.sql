-- RLS e políticas para provider_schedules
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_schedules' AND policyname = 'Providers can select own schedules'
  ) THEN
    CREATE POLICY "Providers can select own schedules"
    ON public.provider_schedules
    FOR SELECT
    USING (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_schedules' AND policyname = 'Providers can upsert own schedules'
  ) THEN
    CREATE POLICY "Providers can upsert own schedules"
    ON public.provider_schedules
    FOR INSERT
    WITH CHECK (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_schedules' AND policyname = 'Providers can update own schedules'
  ) THEN
    CREATE POLICY "Providers can update own schedules"
    ON public.provider_schedules
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
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_schedules' AND policyname = 'Providers can delete own schedules'
  ) THEN
    CREATE POLICY "Providers can delete own schedules"
    ON public.provider_schedules
    FOR DELETE
    USING (
      provider_id IN (
        SELECT id FROM public.users WHERE supabase_uid = auth.uid()
      )
    );
  END IF;
END $$;
