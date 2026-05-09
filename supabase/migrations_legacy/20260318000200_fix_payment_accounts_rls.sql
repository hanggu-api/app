-- Política para permitir INSERT
DROP POLICY IF EXISTS "Users can insert own payment accounts" ON public.payment_accounts;
CREATE POLICY "Users can insert own payment accounts" 
ON public.payment_accounts 
FOR INSERT 
WITH CHECK (
    auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = payment_accounts.user_id
    )
);

-- Política para permitir UPDATE
DROP POLICY IF EXISTS "Users can update own payment accounts" ON public.payment_accounts;
CREATE POLICY "Users can update own payment accounts" 
ON public.payment_accounts 
FOR UPDATE 
USING (
    auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = payment_accounts.user_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT supabase_uid FROM public.users WHERE id = payment_accounts.user_id
    )
);
