-- Corrige FK inconsistente em `trip_cancellation_fees.cancelled_trip_id`
-- Sintoma: ao deletar uma trip, o Postgres tenta `SET cancelled_trip_id = NULL`
-- (ON DELETE SET NULL), mas a coluna é NOT NULL => erro 23502.
--
-- Decisão: manter `cancelled_trip_id` NOT NULL e ajustar FK para ON DELETE CASCADE.

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
      AND c.conrelid = 'public.trip_cancellation_fees'::regclass
      AND c.confrelid = 'public.trips'::regclass
  LOOP
    -- Só mexer em FKs cujo(s) campo(s) incluem cancelled_trip_id
    IF NOT EXISTS (
      SELECT 1
      FROM unnest(fk.conkey) AS k(attnum)
      JOIN pg_attribute a
        ON a.attrelid = fk.conrelid
       AND a.attnum = k.attnum
      WHERE a.attname = 'cancelled_trip_id'
    ) THEN
      CONTINUE;
    END IF;

    -- Já está CASCADE no delete
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

