-- UUID-first unification for fixed providers:
-- provider_professions, provider_tasks, provider_schedules
-- Goal: keep supabase_uid as canonical identity while preserving BIGINT compatibility.

BEGIN;

-- 1) Add UUID identity columns (non-breaking).
ALTER TABLE IF EXISTS public.provider_professions
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

ALTER TABLE IF EXISTS public.provider_tasks
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

ALTER TABLE IF EXISTS public.provider_schedules
  ADD COLUMN IF NOT EXISTS provider_uid uuid;

-- 2) Backfill UUID from numeric ids.
UPDATE public.provider_professions pp
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE pp.provider_uid IS NULL
  AND pp.provider_user_id = u.id
  AND u.supabase_uid IS NOT NULL;

UPDATE public.provider_tasks pt
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE pt.provider_uid IS NULL
  AND pt.provider_id = u.id
  AND u.supabase_uid IS NOT NULL;

UPDATE public.provider_schedules ps
SET provider_uid = u.supabase_uid
FROM public.users u
WHERE ps.provider_uid IS NULL
  AND ps.provider_id = u.id
  AND u.supabase_uid IS NOT NULL;

-- 3) Backfill numeric ids when only UUID is present.
UPDATE public.provider_professions pp
SET provider_user_id = u.id
FROM public.users u
WHERE pp.provider_user_id IS NULL
  AND pp.provider_uid = u.supabase_uid;

UPDATE public.provider_tasks pt
SET provider_id = u.id
FROM public.users u
WHERE pt.provider_id IS NULL
  AND pt.provider_uid = u.supabase_uid;

UPDATE public.provider_schedules ps
SET provider_id = u.id
FROM public.users u
WHERE ps.provider_id IS NULL
  AND ps.provider_uid = u.supabase_uid;

-- 4) Constraints and indexes for UUID-first upserts/lookups.
DO $$
BEGIN
  IF to_regclass('public.provider_professions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_professions_provider_uid_fkey') THEN
    ALTER TABLE public.provider_professions
      ADD CONSTRAINT provider_professions_provider_uid_fkey
      FOREIGN KEY (provider_uid) REFERENCES public.users(supabase_uid) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.provider_tasks') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_tasks_provider_uid_fkey') THEN
    ALTER TABLE public.provider_tasks
      ADD CONSTRAINT provider_tasks_provider_uid_fkey
      FOREIGN KEY (provider_uid) REFERENCES public.users(supabase_uid) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.provider_schedules') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_schedules_provider_uid_fkey') THEN
    ALTER TABLE public.provider_schedules
      ADD CONSTRAINT provider_schedules_provider_uid_fkey
      FOREIGN KEY (provider_uid) REFERENCES public.users(supabase_uid) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.provider_professions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_professions_provider_uid_profession_id_key') THEN
    ALTER TABLE public.provider_professions
      ADD CONSTRAINT provider_professions_provider_uid_profession_id_key
      UNIQUE (provider_uid, profession_id);
  END IF;

  IF to_regclass('public.provider_tasks') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_tasks_provider_uid_task_id_key') THEN
    ALTER TABLE public.provider_tasks
      ADD CONSTRAINT provider_tasks_provider_uid_task_id_key
      UNIQUE (provider_uid, task_id);
  END IF;

  IF to_regclass('public.provider_schedules') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_schedules_provider_uid_day_of_week_key') THEN
    ALTER TABLE public.provider_schedules
      ADD CONSTRAINT provider_schedules_provider_uid_day_of_week_key
      UNIQUE (provider_uid, day_of_week);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_provider_professions_provider_uid
  ON public.provider_professions(provider_uid);

CREATE INDEX IF NOT EXISTS idx_provider_tasks_provider_uid
  ON public.provider_tasks(provider_uid);

CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider_uid
  ON public.provider_schedules(provider_uid);

-- 5) Keep id/uid columns synchronized in all write paths.
CREATE OR REPLACE FUNCTION public.sync_fixed_provider_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'provider_professions' THEN
    IF NEW.provider_uid IS NULL AND NEW.provider_user_id IS NOT NULL THEN
      SELECT u.supabase_uid INTO NEW.provider_uid
      FROM public.users u
      WHERE u.id = NEW.provider_user_id
      LIMIT 1;
    END IF;
    IF NEW.provider_user_id IS NULL AND NEW.provider_uid IS NOT NULL THEN
      SELECT u.id INTO NEW.provider_user_id
      FROM public.users u
      WHERE u.supabase_uid = NEW.provider_uid
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'provider_tasks' THEN
    IF NEW.provider_uid IS NULL AND NEW.provider_id IS NOT NULL THEN
      SELECT u.supabase_uid INTO NEW.provider_uid
      FROM public.users u
      WHERE u.id = NEW.provider_id
      LIMIT 1;
    END IF;
    IF NEW.provider_id IS NULL AND NEW.provider_uid IS NOT NULL THEN
      SELECT u.id INTO NEW.provider_id
      FROM public.users u
      WHERE u.supabase_uid = NEW.provider_uid
      LIMIT 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'provider_schedules' THEN
    IF NEW.provider_uid IS NULL AND NEW.provider_id IS NOT NULL THEN
      SELECT u.supabase_uid INTO NEW.provider_uid
      FROM public.users u
      WHERE u.id = NEW.provider_id
      LIMIT 1;
    END IF;
    IF NEW.provider_id IS NULL AND NEW.provider_uid IS NOT NULL THEN
      SELECT u.id INTO NEW.provider_id
      FROM public.users u
      WHERE u.supabase_uid = NEW.provider_uid
      LIMIT 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.provider_professions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_fixed_provider_identity_provider_professions
      ON public.provider_professions;
    CREATE TRIGGER trg_sync_fixed_provider_identity_provider_professions
    BEFORE INSERT OR UPDATE ON public.provider_professions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_fixed_provider_identity_columns();
  END IF;

  IF to_regclass('public.provider_tasks') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_fixed_provider_identity_provider_tasks
      ON public.provider_tasks;
    CREATE TRIGGER trg_sync_fixed_provider_identity_provider_tasks
    BEFORE INSERT OR UPDATE ON public.provider_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_fixed_provider_identity_columns();
  END IF;

  IF to_regclass('public.provider_schedules') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_fixed_provider_identity_provider_schedules
      ON public.provider_schedules;
    CREATE TRIGGER trg_sync_fixed_provider_identity_provider_schedules
    BEFORE INSERT OR UPDATE ON public.provider_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_fixed_provider_identity_columns();
  END IF;
END $$;

-- 6) RLS: UUID-first ownership checks with legacy BIGINT compatibility.
ALTER TABLE IF EXISTS public.provider_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.provider_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can manage own professions" ON public.provider_professions;
DROP POLICY IF EXISTS "Providers can update own professions" ON public.provider_professions;
CREATE POLICY "Providers can manage own professions"
ON public.provider_professions
FOR ALL
TO authenticated
USING (
  provider_uid = auth.uid()
  OR provider_user_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  provider_uid = auth.uid()
  OR provider_user_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_professions'
      AND policyname = 'Authed can read provider professions'
  ) THEN
    CREATE POLICY "Authed can read provider professions"
    ON public.provider_professions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Authed can read provider tasks" ON public.provider_tasks;
CREATE POLICY "Authed can read provider tasks"
ON public.provider_tasks
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Providers can manage own tasks" ON public.provider_tasks;
CREATE POLICY "Providers can manage own tasks"
ON public.provider_tasks
FOR ALL
TO authenticated
USING (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated can read provider schedules" ON public.provider_schedules;
CREATE POLICY "Authenticated can read provider schedules"
ON public.provider_schedules
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Providers can select own schedules" ON public.provider_schedules;
CREATE POLICY "Providers can select own schedules"
ON public.provider_schedules
FOR SELECT
TO authenticated
USING (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers can upsert own schedules" ON public.provider_schedules;
CREATE POLICY "Providers can upsert own schedules"
ON public.provider_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers can update own schedules" ON public.provider_schedules;
CREATE POLICY "Providers can update own schedules"
ON public.provider_schedules
FOR UPDATE
TO authenticated
USING (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Providers can delete own schedules" ON public.provider_schedules;
CREATE POLICY "Providers can delete own schedules"
ON public.provider_schedules
FOR DELETE
TO authenticated
USING (
  provider_uid = auth.uid()
  OR provider_id IN (
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_uid = auth.uid()
  )
);

COMMIT;
