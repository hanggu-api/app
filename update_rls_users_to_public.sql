CREATE OR REPLACE FUNCTION set_public_users_policy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view users for ride" ON public.users;
    CREATE POLICY "Anyone can view users for ride" ON public.users
        FOR SELECT
        TO authenticated
        USING (true);
END;
$$;
