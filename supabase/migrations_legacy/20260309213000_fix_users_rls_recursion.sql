-- Fix RLS recursion on public.users by avoiding subqueries that read public.users
-- inside policies on public.users. Use a SECURITY DEFINER helper to resolve the
-- current public user id without triggering RLS.

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id
  FROM public.users
  WHERE supabase_uid = auth.uid()
  LIMIT 1;
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip or service participants read related profiles" ON public.users;

CREATE POLICY "Trip or service participants read related profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  users.id = public.current_user_id()
  OR (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE (t.client_id = public.current_user_id() OR t.driver_id = public.current_user_id())
        AND (t.client_id = users.id OR t.driver_id = users.id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.service_requests_new s
      WHERE (s.client_id = public.current_user_id() OR s.provider_id = public.current_user_id())
        AND (s.client_id = users.id OR s.provider_id = users.id)
    )
  )
  OR (users.role = 'provider')
);
