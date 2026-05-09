BEGIN;

DO $$
DECLARE
  _tables text[] := ARRAY[
    'app_config',
    'categories',
    'service_tasks',
    'service_media',
    'notification_registry',
    'transactions',
    'user_devices'
  ];
  _table text;
  _public_exists boolean;
  _backup_exists boolean;
BEGIN
  FOREACH _table IN ARRAY _tables
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = _table
    ) INTO _public_exists;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'legacy_backup'
        AND table_name = _table
    ) INTO _backup_exists;

    IF _public_exists THEN
      RAISE NOTICE 'Tabela public.% já existe. Restore ignorado.', _table;
      CONTINUE;
    END IF;

    IF NOT _backup_exists THEN
      RAISE NOTICE 'Tabela legacy_backup.% não encontrada. Nada a restaurar.', _table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE TABLE public.%I (LIKE legacy_backup.%I INCLUDING ALL)',
      _table,
      _table
    );

    EXECUTE format(
      'INSERT INTO public.%I SELECT * FROM legacy_backup.%I',
      _table,
      _table
    );

    RAISE NOTICE 'Tabela public.% restaurada com sucesso a partir de legacy_backup.%', _table, _table;
  END LOOP;
END
$$;

COMMIT;
