-- Ensure 'driver' is allowed before seed data that inserts driver users.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('client', 'provider', 'driver', 'admin'));
