-- Migração: PADRONIZAÇÃO GLOBAL DE UUID
-- Aplica NEW.id::uuid em todas as funções de gatilho para garantir consistência total

-- 1. Controle de Tempo e Logs Iniciais
CREATE OR REPLACE FUNCTION "public"."enforce_mobile_service_runtime"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.arrived_at := NULL;
    NEW.completed_at := NULL;
    
    INSERT INTO public.service_logs (service_id, action, details)
    VALUES (NEW.id::uuid, 'INITIALIZED', jsonb_build_object('status', NEW.status));
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status <> 'in_progress') THEN
      NEW.arrived_at := now();
    END IF;

    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Despacho e Busca (Gatilho de Criação)
CREATE OR REPLACE FUNCTION "public"."trigger_dispatch_on_service_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_supabase_url  TEXT := current_setting('app.settings.supabase_url', true);
  v_service_key   TEXT := current_setting('app.settings.service_role_key', true);
  v_payload       JSONB;
BEGIN
  IF NEW.status NOT IN ('paid', 'pending', 'searching', 'searching_provider') THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.service_logs (service_id, action, details)
    VALUES (NEW.id::uuid, 'CREATED', jsonb_build_object('message', 'Iniciando busca...'));
  EXCEPTION WHEN others THEN NULL;
  END;

  IF COALESCE(v_supabase_url, '') = '' OR COALESCE(v_service_key, '') = '' THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object('serviceId', NEW.id::uuid, 'action', 'start_dispatch');

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key, 'apikey', v_service_key),
    body := v_payload
  );

  RETURN NEW;
END;
$$;

-- 3. Fila de Despacho (Gatilho de Busca/Pagamento)
CREATE OR REPLACE FUNCTION "public"."enqueue_dispatch_on_searching_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF (NEW.status IN ('paid', 'searching', 'searching_provider')) AND NEW.provider_id IS NULL THEN
    INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
    VALUES (NEW.id::uuid, 'pending', now(), 0, NULL)
    ON CONFLICT (service_id) DO UPDATE
      SET status = CASE WHEN public.service_dispatch_queue.status = 'done' THEN 'pending' ELSE public.service_dispatch_queue.status END,
          next_run_at = now();
  ELSIF (NEW.status NOT IN ('paid', 'searching', 'searching_provider')) OR (NEW.provider_id IS NOT NULL) THEN
    UPDATE public.service_dispatch_queue
    SET status = 'done', next_run_at = now()
    WHERE service_id = NEW.id::uuid AND status <> 'done';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Notificações e Encerramento de Fila
CREATE OR REPLACE FUNCTION "public"."close_queue_rows_on_service_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'canceled', 'completed', 'in_progress', 'open_for_schedule') THEN
    UPDATE public.notificacao_de_servicos
    SET status = 'closed', answered_at = now()
    WHERE service_id = NEW.id::uuid AND status IN ('queued', 'notified');
  END IF;
  RETURN NEW;
END;
$$;
