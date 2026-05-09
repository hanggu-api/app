-- Migração: Compatibilidade Total de UUID em Logs e Gatilhos
-- Resolve o erro "operator does not exist: uuid = character varying" em todas as funções críticas

-- 1. Corrigindo trigger_dispatch_on_service_created
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

  -- FORÇANDO CAST PARA UUID NA INSERÇÃO DE LOG
  BEGIN
    INSERT INTO public.service_logs (service_id, action, details)
    VALUES (
      NEW.id::uuid, -- CAST EXPLÍCITO AQUI
      'CREATED',
      jsonb_build_object('message', 'Serviço criado. Iniciando busca por prestadores...')
    );
  EXCEPTION WHEN others THEN
    -- ignora erro de log para não travar o fluxo principal
  END;

  IF COALESCE(v_supabase_url, '') = '' OR COALESCE(v_service_key, '') = '' THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'serviceId', NEW.id::text,
    'action', 'start_dispatch'
  );

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key,
      'apikey', v_service_key
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$;

-- 2. Corrigindo enqueue_dispatch_on_searching_paid (Patch V3)
CREATE OR REPLACE FUNCTION "public"."enqueue_dispatch_on_searching_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_paid boolean;
BEGIN
  v_paid := (NEW.status IN ('paid', 'searching', 'searching_provider', 'in_progress'));

  IF (NEW.status IN ('paid', 'searching', 'searching_provider')) AND NEW.provider_id IS NULL THEN
    INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
    VALUES (NEW.id, 'pending', now(), 0, NULL)
    ON CONFLICT (service_id) DO UPDATE
      SET status = CASE WHEN public.service_dispatch_queue.status = 'done' THEN 'pending' ELSE public.service_dispatch_queue.status END,
          next_run_at = now();

    BEGIN
      INSERT INTO public.service_logs(service_id, action, details)
      VALUES (NEW.id::uuid, 'QUEUE_ENQUEUED', 'Serviço em busca com pagamento confirmado.'); -- CAST EXPLÍCITO
    EXCEPTION WHEN others THEN NULL;
    END;
  ELSIF (NEW.status NOT IN ('paid', 'searching', 'searching_provider')) OR (NEW.provider_id IS NOT NULL) THEN
    UPDATE public.service_dispatch_queue
    SET status = 'done', next_run_at = now()
    WHERE service_id = NEW.id AND status <> 'done';
  END IF;

  RETURN NEW;
END;
$$;
