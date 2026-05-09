-- Enforce 24h cooldown for driver_payment_mode changes
-- Date: 2026-03-27

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS driver_payment_mode_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill in case the column existed nullable in some environments
UPDATE public.users
SET driver_payment_mode_changed_at = COALESCE(driver_payment_mode_changed_at, now())
WHERE driver_payment_mode_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_driver_payment_mode_cooldown()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_allowed_at timestamptz;
BEGIN
  IF NEW.driver_payment_mode IS DISTINCT FROM OLD.driver_payment_mode THEN
    IF OLD.driver_payment_mode_changed_at IS NOT NULL
      AND OLD.driver_payment_mode_changed_at > (now() - interval '24 hours') THEN
      next_allowed_at := OLD.driver_payment_mode_changed_at + interval '24 hours';
      RAISE EXCEPTION USING
        errcode = 'P0001',
        message = format(
          'Você só pode alterar o modo de pagamento a cada 24 horas. Próxima alteração em %s.',
          to_char(next_allowed_at, 'YYYY-MM-DD HH24:MI:SSOF')
        );
    END IF;

    NEW.driver_payment_mode_changed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_payment_mode_cooldown ON public.users;
CREATE TRIGGER trg_driver_payment_mode_cooldown
BEFORE UPDATE OF driver_payment_mode ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_driver_payment_mode_cooldown();

