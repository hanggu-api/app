-- Migração: Conserto Definitivo de Comparação UUID vs Varchar (V2)
-- Corrige funções que comparam IDs em tabelas de Logs, Notificações e FILA DE DESPACHO

-- 1. Corrigindo close_queue_rows_on_service_transition
CREATE OR REPLACE FUNCTION "public"."close_queue_rows_on_service_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'open_for_schedule' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'open_for_schedule' THEN
    UPDATE public.notificacao_de_servicos
    SET
      status = 'queue_exhausted',
      answered_at = now(),
      skip_reason = 'rounds_exhausted',
      push_status = COALESCE(push_status, 'queue_exhausted')
    WHERE service_id = NEW.id::uuid
      AND status IN ('queued', 'notified');
  END IF;

  IF NEW.status IN ('cancelled', 'canceled') AND COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status THEN
    UPDATE public.notificacao_de_servicos
    SET
      status = 'service_cancelled',
      answered_at = now(),
      skip_reason = 'service_cancelled',
      push_status = COALESCE(push_status, 'service_cancelled')
    WHERE service_id = NEW.id::uuid
      AND status IN ('queued', 'notified');
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Corrigindo enqueue_dispatch_on_searching_paid (COM UUID CAST)
CREATE OR REPLACE FUNCTION "public"."enqueue_dispatch_on_searching_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_paid boolean;
BEGIN
  v_paid := (NEW.status IN ('paid', 'searching', 'searching_provider', 'in_progress'));

  IF (NEW.status IN ('paid', 'searching', 'searching_provider')) AND NEW.provider_id IS NULL THEN
    -- INSERÇÃO NA FILA COM CAST UUID
    INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
    VALUES (NEW.id::uuid, 'pending', now(), 0, NULL)
    ON CONFLICT (service_id) DO UPDATE
      SET status = CASE WHEN public.service_dispatch_queue.status = 'done' THEN 'pending' ELSE public.service_dispatch_queue.status END,
          next_run_at = now();

    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id::uuid, 'QUEUE_ENQUEUED', 'Serviço em busca com pagamento confirmado.');
    EXCEPTION WHEN others THEN NULL;
    END;
  ELSIF (NEW.status NOT IN ('paid', 'searching', 'searching_provider')) OR (NEW.provider_id IS NOT NULL) THEN
    -- UPDATE NA FILA COM CAST UUID
    UPDATE public.service_dispatch_queue
    SET status = 'done', next_run_at = now()
    WHERE service_id = NEW.id::uuid AND status <> 'done';
  END IF;

  RETURN NEW;
END;
$$;
