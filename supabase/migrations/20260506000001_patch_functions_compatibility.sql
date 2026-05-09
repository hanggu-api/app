-- Migração de Conserto de Funções: Compatibilidade com service_requests
-- Esta migração ajusta as funções para não usarem campos inexistentes (started_at, payment_status, etc)

-- 1. Ajustando enforce_mobile_service_runtime
CREATE OR REPLACE FUNCTION "public"."enforce_mobile_service_runtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_is_fixed BOOLEAN;
  v_status TEXT := LOWER(BTRIM(COALESCE(NEW.status, '')));
  v_remaining_paid BOOLEAN := (LOWER(BTRIM(COALESCE(NEW.payment_remaining_status, ''))) = 'paid');
BEGIN
  -- Detecta se é serviço fixo ou agendado
  v_is_fixed := (LOWER(BTRIM(COALESCE(NEW.location_type, ''))) = 'provider')
    OR NEW.scheduled_at IS NOT NULL;
    
  IF v_is_fixed THEN
    RETURN NEW;
  END IF;

  -- Controle de status_updated_at (se existir na tabela)
  NEW.status_updated_at := NOW();

  -- Se chegou ao local e ainda não tinha arrived_at
  IF v_status IN ('waiting_payment_remaining', 'waiting_remaining_payment') AND NEW.arrived_at IS NULL THEN
    NEW.arrived_at := NOW();
  END IF;

  -- Se o pagamento restante foi confirmado, move para in_progress
  IF v_remaining_paid AND v_status IN ('waiting_payment_remaining', 'waiting_remaining_payment') THEN
    NEW.status := 'in_progress';
    v_status := 'in_progress';
  END IF;

  -- Gerar códigos de validação se entrar em progresso
  IF v_status = 'in_progress' THEN
    IF BTRIM(COALESCE(NEW.validation_code, '')) = '' THEN
      NEW.validation_code := SUBSTR(MD5(RANDOM()::TEXT), 1, 6); -- Fallback simples se a função generate não existir
    END IF;
  END IF;

  -- Se completado, preenche completed_at
  IF v_status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;

  -- Removido todas as referências a started_at e finished_at para evitar erros 500

  RETURN NEW;
END;
$$;

-- 2. Ajustando enqueue_dispatch_on_searching_paid
CREATE OR REPLACE FUNCTION "public"."enqueue_dispatch_on_searching_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_paid boolean;
  v_should_enqueue boolean;
  v_should_done boolean;
BEGIN
  -- Na service_requests, consideramos pago se o status for 'paid' ou 'searching'
  v_paid := (NEW.status IN ('paid', 'searching', 'searching_provider', 'in_progress'));

  v_should_enqueue :=
    (NEW.status IN ('paid', 'searching', 'searching_provider'))
    AND NEW.provider_id IS NULL;

  v_should_done :=
    (NEW.status NOT IN ('paid', 'searching', 'searching_provider'))
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

    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id, 'QUEUE_ENQUEUED', 'Serviço em busca com pagamento confirmado.');
    EXCEPTION WHEN others THEN NULL;
    END;
  ELSIF v_should_done THEN
    UPDATE public.service_dispatch_queue
    SET status = 'done',
        next_run_at = now(),
        last_error = NULL
    WHERE service_id = NEW.id
      AND status <> 'done';
  END IF;

  RETURN NEW;
END;
$$;
