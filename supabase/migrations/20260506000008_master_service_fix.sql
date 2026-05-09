-- MASTER MIGRATION: Unificação de service_requests e Gatilhos
-- Resolve: Colunas faltantes, Erros de Trigger, Redundância e Conflitos de UUID

-- 1. GARANTIR TODAS AS COLUNAS (Unindo o seu SQL com a necessidade do Webhook)
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS payment_id character varying(100),
ADD COLUMN IF NOT EXISTS payment_provider character varying(50) DEFAULT 'mercado_pago',
ADD COLUMN IF NOT EXISTS payment_status character varying(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_remaining_status character varying(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone;

-- 2. LIMPEZA TOTAL DE GATILHOS ANTIGOS (Para evitar duplicidade)
DROP TRIGGER IF EXISTS enforce_secure_payment_status ON public.service_requests;
DROP TRIGGER IF EXISTS on_service_created_dispatch ON public.service_requests;
DROP TRIGGER IF EXISTS on_service_request_change ON public.service_requests;
DROP TRIGGER IF EXISTS tg_close_queue ON public.service_requests;
DROP TRIGGER IF EXISTS tg_enqueue_dispatch ON public.service_requests;
DROP TRIGGER IF EXISTS trg_close_queue_rows_on_service_transition ON public.service_requests;
DROP TRIGGER IF EXISTS trg_enforce_mobile_runtime ON public.service_requests;
DROP TRIGGER IF EXISTS trg_enqueue_dispatch_on_searching_paid ON public.service_requests;
DROP TRIGGER IF EXISTS trg_mobile_service_runtime ON public.service_requests;
DROP TRIGGER IF EXISTS trg_sync_service_status_to_agendamento ON public.service_requests;
DROP TRIGGER IF EXISTS trg_mobile_runtime_master ON public.service_requests;
DROP TRIGGER IF EXISTS trg_dispatch_master ON public.service_requests;
DROP TRIGGER IF EXISTS trg_notifications_master ON public.service_requests;

-- 3. PADRONIZAÇÃO DAS FUNÇÕES DE GATILHO (Garantindo UUID e colunas novas)

-- Função: Controle de Runtime (Chegada e Timestamps)
CREATE OR REPLACE FUNCTION public.enforce_mobile_service_runtime()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Registra chegada se mudar para in_progress
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status <> 'in_progress') THEN
      NEW.arrived_at := now();
    END IF;
  END IF;
  
  -- Atualiza timestamp de status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REINSTALAÇÃO DOS GATILHOS (Versão Otimizada e Sem Conflitos)

-- Gatilho de Runtime
CREATE TRIGGER trg_mobile_runtime_master
BEFORE INSERT OR UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_mobile_service_runtime();

-- Gatilho de Dispatch (Sempre que status for searching e estiver pago)
CREATE TRIGGER trg_dispatch_master
AFTER INSERT OR UPDATE OF status ON public.service_requests
FOR EACH ROW 
WHEN (NEW.status = 'searching' AND NEW.payment_status = 'paid')
EXECUTE FUNCTION trigger_dispatch_on_service_created();

-- Gatilho de Notificações
CREATE TRIGGER trg_notifications_master
AFTER INSERT OR UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION trigger_push_notifications();

-- 5. AJUSTES DE COMPATIBILIDADE DE TIPO (UUID)
ALTER TABLE IF EXISTS public.service_logs 
ALTER COLUMN service_id TYPE uuid USING service_id::uuid;

-- 6. RECARREGAR CACHE
NOTIFY pgrst, 'reload schema';
