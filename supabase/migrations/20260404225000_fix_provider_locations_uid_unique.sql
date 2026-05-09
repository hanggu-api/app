-- Fix ON CONFLICT(provider_uid) for provider_heartbeat RPC:
-- ON CONFLICT inference cannot use a partial unique index without a matching WHERE clause.
-- A normal UNIQUE index works fine (multiple NULLs are allowed).

DROP INDEX IF EXISTS public.provider_locations_provider_uid_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS provider_locations_provider_uid_unique
ON public.provider_locations(provider_uid);

