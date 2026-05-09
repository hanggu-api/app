-- Migração de Emergência V2: Ajustada para colunas reais e tipos de dados
-- Resolve o erro "uuid = character varying" usando CAST

DO $$ 
BEGIN
    -- 1. Limpeza de gatilhos antigos
    DROP TRIGGER IF EXISTS trg_enqueue_dispatch_on_searching_paid ON public.service_requests;
    DROP TRIGGER IF EXISTS trg_close_queue_rows_on_service_transition ON public.service_requests;
    DROP TRIGGER IF EXISTS on_service_request_change ON public.service_requests;
    DROP TRIGGER IF EXISTS on_service_created_dispatch ON public.service_requests;
    DROP TRIGGER IF EXISTS trg_mobile_service_runtime ON public.service_requests;

    -- 2. Recriar os gatilhos focando apenas em 'status' e 'provider_id' (já que payment_status não existe nesta tabela)
    
    CREATE TRIGGER trg_enqueue_dispatch_on_searching_paid
    AFTER INSERT OR UPDATE OF status, provider_id ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.enqueue_dispatch_on_searching_paid();

    CREATE TRIGGER trg_close_queue_rows_on_service_transition
    AFTER UPDATE OF status ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.close_queue_rows_on_service_transition();

    CREATE TRIGGER on_service_request_change
    AFTER INSERT OR UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.trigger_push_notifications();

    CREATE TRIGGER on_service_created_dispatch
    AFTER INSERT ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.trigger_dispatch_on_service_created();

    CREATE TRIGGER trg_mobile_service_runtime
    BEFORE INSERT OR UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.enforce_mobile_service_runtime();

END $$;

-- 3. Corrigindo a função de sincronização com CAST explícito para UUID
CREATE OR REPLACE FUNCTION public.sync_service_status_to_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.agendamento_servico
    SET 
        status = NEW.status,
        updated_at = NOW()
    WHERE id = NEW.id::uuid -- FORÇA A CONVERSÃO DE TEXTO PARA UUID
      AND (status IS DISTINCT FROM NEW.status);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_agendamento_status_to_requests()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.service_requests
    SET 
        status = NEW.status,
        status_updated_at = NOW()
    WHERE id = NEW.id::text -- FORÇA A CONVERSÃO DE UUID PARA TEXTO
      AND (status IS DISTINCT FROM NEW.status);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
