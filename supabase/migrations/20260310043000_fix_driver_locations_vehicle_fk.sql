-- Ensure driver_locations can join vehicles by driver_id for Supabase relationships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'vehicles_driver_id_key'
    ) THEN
        ALTER TABLE public.vehicles
        ADD CONSTRAINT vehicles_driver_id_key UNIQUE (driver_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'driver_locations_driver_id_fkey_vehicle'
    ) THEN
        ALTER TABLE public.driver_locations
        ADD CONSTRAINT driver_locations_driver_id_fkey_vehicle
        FOREIGN KEY (driver_id) REFERENCES public.vehicles(driver_id) ON DELETE CASCADE;
    END IF;
END $$;
