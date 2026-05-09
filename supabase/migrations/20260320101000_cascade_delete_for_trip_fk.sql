-- Garante limpeza automática de dados relacionados à corrida ao deletar em public.trips
-- Objetivo: ambiente de testes poder remover uma trip e todos os registros filhos
-- (payments, logs, reviews, etc.) sem erro de FK.

DO $$
DECLARE
  fk RECORD;
  child_cols TEXT;
  parent_cols TEXT;
  on_update_action TEXT;
  deferrable_clause TEXT;
BEGIN
  FOR fk IN
    SELECT
      c.oid,
      c.conname,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      c.confupdtype,
      c.confdeltype,
      c.condeferrable,
      c.condeferred,
      c.conrelid::regclass AS child_table,
      c.confrelid::regclass AS parent_table
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.trips'::regclass
  LOOP
    -- Já está em CASCADE no delete: não precisa recriar.
    IF fk.confdeltype = 'c' THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY x.ord)
      INTO child_cols
    FROM unnest(fk.conkey) WITH ORDINALITY AS x(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = fk.conrelid
     AND a.attnum = x.attnum;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY x.ord)
      INTO parent_cols
    FROM unnest(fk.confkey) WITH ORDINALITY AS x(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = fk.confrelid
     AND a.attnum = x.attnum;

    on_update_action := CASE fk.confupdtype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE 'NO ACTION'
    END;

    deferrable_clause :=
      CASE WHEN fk.condeferrable THEN ' DEFERRABLE' ELSE ' NOT DEFERRABLE' END ||
      CASE WHEN fk.condeferred THEN ' INITIALLY DEFERRED' ELSE ' INITIALLY IMMEDIATE' END;

    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      fk.child_table,
      fk.conname
    );

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s (%s) ON UPDATE %s ON DELETE CASCADE%s',
      fk.child_table,
      fk.conname,
      child_cols,
      fk.parent_table,
      parent_cols,
      on_update_action,
      deferrable_clause
    );

    RAISE NOTICE 'FK % atualizada para ON DELETE CASCADE em %', fk.conname, fk.child_table;
  END LOOP;
END
$$;
