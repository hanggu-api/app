-- Final Schema Reconciliation
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS service_type varchar(20) DEFAULT 'on_site' CHECK (service_type IN ('on_site', 'at_provider', 'remote'));
ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS icon varchar(64);
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS bio TEXT;

-- Ensure UNIQUE on professions.name
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professions_name_key') THEN
        -- Reassign and delete duplicates first
        UPDATE public.task_catalog tc
        SET profession_id = (SELECT MIN(id) FROM public.professions p WHERE p.name = (SELECT name FROM public.professions p2 WHERE p2.id = tc.profession_id))
        WHERE EXISTS (
            SELECT 1 FROM public.professions p1, public.professions p2
            WHERE p1.name = p2.name AND p1.id < p2.id AND tc.profession_id = p2.id
        );

        UPDATE public.provider_professions pp
        SET profession_id = (SELECT MIN(id) FROM public.professions p WHERE p.name = (SELECT name FROM public.professions p2 WHERE p2.id = pp.profession_id))
        WHERE EXISTS (
            SELECT 1 FROM public.professions p1, public.professions p2
            WHERE p1.name = p2.name AND p1.id < p2.id AND pp.profession_id = p2.id
        );

        DELETE FROM public.professions a
        USING public.professions b
        WHERE a.name = b.name AND a.id > b.id;

        ALTER TABLE public.professions ADD CONSTRAINT professions_name_key UNIQUE (name);
    END IF;
END $$;
