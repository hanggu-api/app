-- Migration to add missing columns and fix triggers for service_requests
-- Created to resolve PGRST204 error in mp-pix-webhook

-- 1. Add missing columns
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_status character varying(20) DEFAULT 'pending';

-- 2. Fix triggers
DROP TRIGGER IF EXISTS trg_enforce_mobile_runtime ON public.service_requests;
DROP TRIGGER IF EXISTS enforce_mobile_service_runtime_trg ON public.service_requests;

CREATE OR REPLACE FUNCTION public.enforce_mobile_service_runtime()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status <> 'in_progress') THEN
      NEW.arrived_at := now();
    END IF;
  END IF;
  
  IF NEW.status <> OLD.status THEN
    NEW.status_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_mobile_runtime
BEFORE INSERT OR UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_mobile_service_runtime();

-- 3. Sync schema cache
NOTIFY pgrst, 'reload schema';
