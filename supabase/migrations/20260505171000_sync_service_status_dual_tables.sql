-- Sincronização de status entre service_requests e agendamento_servico
-- Isso garante que o Realtime do cliente (geralmente ouvindo agendamento_servico) 
-- receba as atualizações feitas pelo prestador na service_requests.

CREATE OR REPLACE FUNCTION public.sync_service_status_to_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Tenta atualizar o status na agendamento_servico se o ID existir lá
    UPDATE public.agendamento_servico
    SET 
        status = NEW.status,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Corrigindo o corpo da função
CREATE OR REPLACE FUNCTION public.sync_service_status_to_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.agendamento_servico
    SET 
        status = NEW.status,
        updated_at = NOW()
    WHERE id = NEW.id 
      AND (status IS DISTINCT FROM NEW.status); -- Evita recursão infinita se houver trigger inversa
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_service_status_to_agendamento ON public.service_requests;
CREATE TRIGGER trg_sync_service_status_to_agendamento
AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_status_to_agendamento();

-- Sincronização inversa (Opcional, mas boa para consistência total)
CREATE OR REPLACE FUNCTION public.sync_agendamento_status_to_requests()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.service_requests
    SET 
        status = NEW.status,
        status_updated_at = NOW()
    WHERE id = NEW.id
      AND (status IS DISTINCT FROM NEW.status);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_agendamento_status_to_requests ON public.agendamento_servico;
CREATE TRIGGER trg_sync_agendamento_status_to_requests
AFTER UPDATE OF status ON public.agendamento_servico
FOR EACH ROW
EXECUTE FUNCTION public.sync_agendamento_status_to_requests();
