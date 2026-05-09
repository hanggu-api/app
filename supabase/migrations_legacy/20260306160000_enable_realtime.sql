-- Habilitar Realtime para a tabela trips sem falhar se já estiver publicada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'trips'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
    ELSE
        RAISE NOTICE 'public.trips já está na publication supabase_realtime.';
    END IF;
END $$;
