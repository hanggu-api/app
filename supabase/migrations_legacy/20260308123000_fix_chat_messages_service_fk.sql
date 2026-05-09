-- Fix legacy FK on chat_messages.service_id.
-- Current app uses trip/service UUIDs from:
--   - public.trips
--   - public.service_requests_new
-- Legacy schema pointed to public.service_requests only, causing 23503.

-- 1) Remove legacy FK that forces service_id to exist in public.service_requests.
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_service_id_fkey;

-- 2) Keep referential integrity via trigger that accepts both current tables
--    (and legacy service_requests if it still exists).
CREATE OR REPLACE FUNCTION public.validate_chat_service_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trips (current transport flow)
  IF EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id::text = NEW.service_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Service requests new (current services flow)
  IF EXISTS (
    SELECT 1
    FROM public.service_requests_new s
    WHERE s.id::text = NEW.service_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Legacy table fallback if present
  IF to_regclass('public.service_requests') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.service_requests s
      WHERE s.id::text = NEW.service_id
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION
    'chat_messages.service_id (%) não encontrado em trips/service_requests_new/service_requests',
    NEW.service_id
    USING ERRCODE = '23503';
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_chat_service_ref ON public.chat_messages;
CREATE TRIGGER trg_validate_chat_service_ref
BEFORE INSERT OR UPDATE OF service_id
ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_chat_service_ref();

