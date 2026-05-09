-- Permitir INSERT/UPDATE na documents_driver pelo próprio usuário autenticado.
-- A tabela pode não existir em alguns ambientes; nesse caso, esta migration é ignorada.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'documents_driver'
  ) THEN
    RAISE NOTICE 'Tabela public.documents_driver inexistente; migration 20260317170000 ignorada.';
    RETURN;
  END IF;

  ALTER TABLE public.documents_driver ENABLE ROW LEVEL SECURITY;

  EXECUTE $sql$
    DROP POLICY IF EXISTS "Users can insert own driver docs" ON public.documents_driver
  $sql$;
  EXECUTE $sql$
    CREATE POLICY "Users can insert own driver docs"
    ON public.documents_driver
    FOR INSERT
    WITH CHECK (
      auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = documents_driver.user_id
      )
    )
  $sql$;

  EXECUTE $sql$
    DROP POLICY IF EXISTS "Users can update own driver docs" ON public.documents_driver
  $sql$;
  EXECUTE $sql$
    CREATE POLICY "Users can update own driver docs"
    ON public.documents_driver
    FOR UPDATE
    USING (
      auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = documents_driver.user_id
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = documents_driver.user_id
      )
    )
  $sql$;
END
$$;
