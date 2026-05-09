-- Ensure ai_search_logs.user_id stays UUID and references auth.users(id)
-- (ai_search_logs policies expect auth.uid() = user_id)

BEGIN;

-- If user_id is not uuid for some reason, force it back to uuid (historical rows become NULL).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_search_logs'
      AND column_name = 'user_id'
      AND udt_name <> 'uuid'
  ) THEN
    ALTER TABLE public.ai_search_logs
      ALTER COLUMN user_id TYPE uuid
      USING NULL::uuid;
  END IF;
END $$;

-- Add FK (best-effort)
ALTER TABLE public.ai_search_logs
  DROP CONSTRAINT IF EXISTS ai_search_logs_user_id_fkey;

ALTER TABLE public.ai_search_logs
  ADD CONSTRAINT ai_search_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_search_logs_user_id_idx ON public.ai_search_logs (user_id);

COMMIT;
