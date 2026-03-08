-- Allow authenticated users to read driver locations.
-- This is necessary for passengers to see the driver moving on their map via Realtime.

CREATE POLICY "Allow authenticated read access to driver_locations" 
ON public.driver_locations 
FOR SELECT 
TO authenticated 
USING (true);

-- Also ensure realtime is enabled for this table if it wasn't already.
alter publication supabase_realtime add table driver_locations;
