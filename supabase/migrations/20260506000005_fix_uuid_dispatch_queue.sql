-- Migração: Conserto de UUID na Fila de Despacho
-- Garante que a inserção na fila de busca aceite IDs de texto da service_requests

CREATE OR REPLACE FUNCTION "public"."enqueue_dispatch_on_searching_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_paid boolean;
BEGIN
  v_paid := (NEW.status IN ('paid', 'searching', 'searching_provider', 'in_progress'));

  IF (NEW.status IN ('paid', 'searching', 'searching_provider')) AND NEW.provider_id IS NULL THEN
    -- INSERÇÃO NA FILA COM CAST UUID EXPLÍCITO
    BEGIN
      INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
      VALUES (NEW.id::uuid, 'pending', now(), 0, NULL)
      ON CONFLICT (service_id) DO UPDATE
        SET status = CASE WHEN public.service_dispatch_queue.status = 'done' THEN 'pending' ELSE public.service_dispatch_queue.status END,
            next_run_at = now();
    EXCEPTION WHEN others THEN
      -- log do erro mas não trava o insert principal do serviço
      RAISE WARNING 'Erro ao enfileirar despacho para serviço %: %', NEW.id, SQLERRM;
    END;

    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id::uuid, 'QUEUE_ENQUEUED', 'Serviço em busca com pagamento confirmado.');
    EXCEPTION WHEN others THEN NULL;
    END;
  ELSIF (NEW.status NOT IN ('paid', 'searching', 'searching_provider')) OR (NEW.provider_id IS NOT NULL) THEN
    -- UPDATE NA FILA COM CAST UUID EXPLÍCITO
    UPDATE public.service_dispatch_queue
    SET status = 'done', next_run_at = now()
    WHERE service_id = NEW.id::uuid AND status <> 'done';
  END IF;

  RETURN NEW;
END;
$$;
