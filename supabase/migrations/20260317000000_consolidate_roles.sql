-- Migration: Consolidate Driver Roles and Sync Status
-- Created at: 2026-03-17 00:00:00

-- 1. Ensure all users with vehicles are marked as 'driver'
UPDATE public.users
SET role = 'driver'
WHERE id IN (
    SELECT driver_id FROM public.vehicles
) AND role != 'driver';

-- 2. Ensure all providers associated with Uber (profession 'Transporte') are marked as 'driver' in public.users
UPDATE public.users
SET role = 'driver'
WHERE id IN (
    SELECT provider_user_id 
    FROM public.provider_professions pp
    JOIN public.professions p ON pp.profession_id = p.id
    WHERE p.name = 'Transporte'
) AND role != 'driver';

-- 3. Sync is_online status from providers to users for consistent tracking
-- (Assuming users table has or should have an is_online column for real-time tracking)
-- First, let's check if the column exists or add it if we decided to use it as the main source.
-- For now, let's ensure the providers table remains accurate for the legacy service logic.

-- 4. Clean up any 'driver' roles that might have been incorrectly assigned to non-transport users
-- (Optional: only if we have strict role definitions)

-- 5. Update user_profiles_complete to reflect the correct role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles_complete' AND table_schema = 'public') THEN
        -- Add role column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles_complete' AND column_name = 'role') THEN
            ALTER TABLE public.user_profiles_complete ADD COLUMN role text;
        END IF;

        -- Update the role from public.users
        UPDATE public.user_profiles_complete upc
        SET role = u.role
        FROM public.users u
        WHERE upc.user_id = u.id AND (upc.role IS NULL OR upc.role != u.role);
    END IF;
END $$;
