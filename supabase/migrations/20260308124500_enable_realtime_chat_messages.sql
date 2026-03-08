-- Enable realtime replication for chat_messages.
-- Symptom fixed: sender sees optimistic local message, recipient does not receive live updates.

DO $$
BEGIN
  -- Needed for reliable UPDATE/DELETE payloads; safe for INSERT-only too.
  ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabela public.chat_messages não existe neste ambiente.';
END $$;

DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'public.chat_messages já está na publication supabase_realtime.';
    END;
  END IF;
END $$;

