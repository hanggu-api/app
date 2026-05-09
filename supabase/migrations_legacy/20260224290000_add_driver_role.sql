-- Migration: Add 'driver' role to users table and update constraints
-- We drop the old check constraint and add a new one that includes 'driver'

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'provider', 'driver', 'admin'));

-- Adding vehicle_type_id to vehicles table to link with vehicle_types
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type_id INTEGER REFERENCES public.vehicle_types(id);

-- Ensure current roles are valid
UPDATE public.users SET role = 'client' WHERE role IS NULL;
