-- Resilient dispatch queue for services in `searching` with confirmed payment.
-- Goal: avoid relying only on payment webhook; a worker will retry dispatch automatically.

-- 1) Table
CREATE TABLE IF NOT EXISTS public.service_dispatch_queue (
  service_id   uuid PRIMARY KEY REFERENCES public.service_requests_new(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending', -- pending | running | done | error
  next_run_at  timestamptz NOT NULL DEFAULT now(),
  attempts     integer NOT NULL DEFAULT 0,
  last_error   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_dispatch_queue_next_run_at
  ON public.service_dispatch_queue(next_run_at);

-- 2) updated_at helper
CREATE OR REPLACE FUNCTION public.touch_service_dispatch_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_service_dispatch_queue_updated_at ON public.service_dispatch_queue;
CREATE TRIGGER trg_touch_service_dispatch_queue_updated_at
BEFORE UPDATE ON public.service_dispatch_queue
FOR EACH ROW
EXECUTE FUNCTION public.touch_service_dispatch_queue_updated_at();

-- 3) RLS (service role only)
ALTER TABLE public.service_dispatch_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role can manage dispatch queue" ON public.service_dispatch_queue;
CREATE POLICY "service_role can manage dispatch queue"
  ON public.service_dispatch_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4) Trigger function: enqueue on searching+paid and mark done when service exits searching/gets provider
CREATE OR REPLACE FUNCTION public.enqueue_dispatch_on_searching_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid boolean;
  v_should_enqueue boolean;
  v_should_done boolean;
BEGIN
  v_paid := (NEW.payment_status IN ('paid', 'partially_paid', 'paid_manual'));

  v_should_enqueue :=
    (NEW.status = 'searching')
    AND v_paid
    AND NEW.provider_id IS NULL;

  v_should_done :=
    (NEW.status IS DISTINCT FROM 'searching')
    OR (NEW.provider_id IS NOT NULL);

  IF v_should_enqueue THEN
    INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
    VALUES (NEW.id, 'pending', now(), 0, NULL)
    ON CONFLICT (service_id) DO UPDATE
      SET status = CASE
        WHEN public.service_dispatch_queue.status = 'done' THEN 'pending'
        ELSE public.service_dispatch_queue.status
      END,
          next_run_at = now(),
          last_error = NULL;

    -- Best-effort log (schema: action/details)
    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id, 'QUEUE_ENQUEUED', 'Serviço em searching com pagamento confirmado. Enfileirado para dispatch resiliente.');
    EXCEPTION WHEN others THEN
      -- ignore logging failures
    END;
  ELSIF v_should_done THEN
    UPDATE public.service_dispatch_queue
    SET status = 'done',
        next_run_at = now(),
        last_error = NULL
    WHERE service_id = NEW.id
      AND status <> 'done';

    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id, 'QUEUE_DONE', 'Serviço saiu de searching ou já possui prestador. Fila marcada como done.');
    EXCEPTION WHEN others THEN
      -- ignore logging failures
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_dispatch_on_searching_paid ON public.service_requests_new;
CREATE TRIGGER trg_enqueue_dispatch_on_searching_paid
AFTER INSERT OR UPDATE OF status, payment_status, provider_id ON public.service_requests_new
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_dispatch_on_searching_paid();

