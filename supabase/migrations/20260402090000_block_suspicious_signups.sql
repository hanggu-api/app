-- Anti-bot: block suspicious signups at Auth level using metadata sent by the client.
-- Strategy:
-- - Always block if honeypot fields are filled.
-- - Block if elapsed time is impossibly fast (< 1200ms), or if extremely fast and no field-change events.

CREATE OR REPLACE FUNCTION public.block_suspicious_signups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anti_bot jsonb;
  elapsed_ms int;
  hp_birth_date text;
  hp_mother_name text;
  total_changes int;
BEGIN
  anti_bot := COALESCE(new.raw_user_meta_data->'anti_bot', '{}'::jsonb);
  elapsed_ms := COALESCE((anti_bot->>'elapsed_ms')::int, NULL);
  hp_birth_date := COALESCE(anti_bot->'honeypot'->>'birth_date', '');
  hp_mother_name := COALESCE(anti_bot->'honeypot'->>'mother_name', '');

  -- Honeypot filled => bot
  IF length(trim(hp_birth_date)) > 0 OR length(trim(hp_mother_name)) > 0 THEN
    RAISE EXCEPTION 'blocked_signup_bot_honeypot';
  END IF;

  -- Sum of change counts (if provided)
  SELECT COALESCE(SUM((value)::int), 0)
  INTO total_changes
  FROM jsonb_each_text(COALESCE(anti_bot->'changes', '{}'::jsonb));

  -- Impossibly fast submissions
  IF elapsed_ms IS NOT NULL THEN
    IF elapsed_ms < 1200 THEN
      RAISE EXCEPTION 'blocked_signup_too_fast';
    END IF;
    IF elapsed_ms < 2500 AND total_changes = 0 THEN
      RAISE EXCEPTION 'blocked_signup_no_interaction';
    END IF;
  END IF;

  RETURN new;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'before_auth_user_created_block_suspicious'
  ) THEN
    CREATE TRIGGER before_auth_user_created_block_suspicious
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.block_suspicious_signups();
  END IF;
END $$;

