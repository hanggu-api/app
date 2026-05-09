-- Migration: Update RLS policies for trips to allow drivers to see searching trips
DROP POLICY IF EXISTS "Motoristas podem ver suas viagens" ON public.trips;

CREATE POLICY "Motoristas podem ver viagens atribuídas ou em busca" ON public.trips
FOR SELECT USING (
  status = 'searching' 
  OR auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id)
);

-- Allow drivers to update trips they are assigned to or that are in searching status (to accept them)
CREATE POLICY "Motoristas podem aceitar viagens" ON public.trips
FOR UPDATE USING (
  status = 'searching' 
  OR auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = driver_id)
);
