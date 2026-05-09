-- RLS policies for provider_tasks (provider services offered per provider)
-- Table created in: 20260330155500_create_provider_tasks.sql

ALTER TABLE public.provider_tasks ENABLE ROW LEVEL SECURITY;

-- Read access: any authenticated user can read provider tasks (needed to show provider services in app).
DROP POLICY IF EXISTS "Authed can read provider tasks" ON public.provider_tasks;
CREATE POLICY "Authed can read provider tasks"
ON public.provider_tasks
FOR SELECT
TO authenticated
USING (true);

-- Write access: provider can manage only their own rows.
DROP POLICY IF EXISTS "Providers can manage own tasks" ON public.provider_tasks;
CREATE POLICY "Providers can manage own tasks"
ON public.provider_tasks
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT supabase_uid
    FROM public.users
    WHERE id = provider_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT supabase_uid
    FROM public.users
    WHERE id = provider_id
  )
);

