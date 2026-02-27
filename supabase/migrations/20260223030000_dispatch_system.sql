-- Migration: 20260223030000_dispatch_system.sql
-- Sistema de dispatch automático: tabelas, funções, trigger e pg_net

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Habilitar extensões necessárias
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;      -- HTTP requests assíncronos do DB

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Colunas de dispatch em service_requests_new
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_requests_new' AND column_name = 'dispatch_round') THEN
        ALTER TABLE public.service_requests_new ADD COLUMN dispatch_round INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_requests_new' AND column_name = 'dispatch_started_at') THEN
        ALTER TABLE public.service_requests_new ADD COLUMN dispatch_started_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_requests_new' AND column_name = 'latitude') THEN
        ALTER TABLE public.service_requests_new ADD COLUMN latitude DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_requests_new' AND column_name = 'longitude') THEN
        ALTER TABLE public.service_requests_new ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tabela: service_logs (timeline de eventos por serviço)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_logs (
    id          BIGSERIAL PRIMARY KEY,
    service_id  UUID REFERENCES public.service_requests_new(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,       -- CREATED, DISPATCH_STARTED, PROVIDER_NOTIFIED, etc.
    message     TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_logs_service_id ON public.service_logs (service_id, created_at DESC);

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver logs dos seus serviços" ON public.service_logs;
CREATE POLICY "Usuário pode ver logs dos seus serviços"
    ON public.service_logs FOR SELECT
    USING (
        service_id IN (
            SELECT id FROM public.service_requests_new
            WHERE client_id::text = auth.uid()::text
               OR provider_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Service role pode inserir logs" ON public.service_logs;
CREATE POLICY "Service role pode inserir logs"
    ON public.service_logs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Tabela: service_offers (tracking de quem foi notificado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_offers (
    id          BIGSERIAL PRIMARY KEY,
    service_id  UUID REFERENCES public.service_requests_new(id) ON DELETE CASCADE,
    provider_id UUID,
    status      TEXT NOT NULL DEFAULT 'offered', -- offered, accepted, rejected, expired
    round       INTEGER DEFAULT 0,
    offered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    UNIQUE(service_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_service_offers_service_id ON public.service_offers (service_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_provider ON public.service_offers (provider_id, status);

ALTER TABLE public.service_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prestador pode ver suas ofertas" ON public.service_offers;
CREATE POLICY "Prestador pode ver suas ofertas"
    ON public.service_offers FOR SELECT
    USING (provider_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Service role pode gerenciar ofertas" ON public.service_offers;
CREATE POLICY "Service role pode gerenciar ofertas"
    ON public.service_offers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: find_nearby_providers — Haversine dentro do raio, filtra por profissão
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION,
    p_profession_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id           BIGINT,
    name         TEXT,
    fcm_token    TEXT,
    distance_km  DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        p.user_id AS id,
        u.full_name AS name,
        u.fcm_token,
        (
            6371 * acos(
                LEAST(1.0, cos(radians(p_lat)) * cos(radians(p.latitude))
                * cos(radians(p.longitude) - radians(p_lon))
                + sin(radians(p_lat)) * sin(radians(p.latitude)))
            )
        ) AS distance_km
    FROM public.providers p
    JOIN public.users u ON u.id = p.user_id
    WHERE
        u.role = 'provider'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND u.fcm_token IS NOT NULL
        AND (
            6371 * acos(
                LEAST(1.0, cos(radians(p_lat)) * cos(radians(p.latitude))
                * cos(radians(p.longitude) - radians(p_lon))
                + sin(radians(p_lat)) * sin(radians(p.latitude)))
            )
        ) <= p_radius_km
    ORDER BY distance_km ASC
    LIMIT 10;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DB TRIGGER: Ao criar um serviço, chamar a Edge Function dispatch via pg_net
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_dispatch_on_service_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_supabase_url  CONSTANT TEXT := 'https://mroesvsmylnaxelrhqtl.supabase.co';
    v_service_key   CONSTANT TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yb2VzdnNteWxuYXhlbHJocXRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc4Njg1OSwiZXhwIjoyMDg3MzYyODU5fQ.WmScJxW8Ukolb9atD4t7bd5FSqrs2r536aWNBEV_vmM';
    v_payload       JSONB;
BEGIN
    -- Só disparar quando o serviço for criado com status paid, pending ou searching
    IF NEW.status NOT IN ('paid', 'pending', 'searching') THEN
        RETURN NEW;
    END IF;

    -- Registrar log inicial
    INSERT INTO public.service_logs (service_id, event_type, message)
    VALUES (NEW.id, 'CREATED', 'Serviço criado. Iniciando busca por prestadores...');

    v_payload := jsonb_build_object(
        'serviceId', NEW.id::text,
        'action', 'start_dispatch'
    );

    -- Chamar Edge Function via pg_net (assíncrono, não bloqueia o INSERT)
    PERFORM net.http_post(
        url     := v_supabase_url || '/functions/v1/dispatch',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'apikey',        v_service_key
        ),
        body    := v_payload::text
    );

    RETURN NEW;
END;
$$;

-- Criar trigger no INSERT de service_requests_new
DROP TRIGGER IF EXISTS on_service_created_dispatch ON public.service_requests_new;
CREATE TRIGGER on_service_created_dispatch
    AFTER INSERT ON public.service_requests_new
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_dispatch_on_service_created();

COMMENT ON FUNCTION public.trigger_dispatch_on_service_created() IS
    'Trigger AFTER INSERT que chama a Edge Function dispatch via pg_net para iniciar a busca automática de prestadores.';
COMMENT ON TABLE public.service_logs IS
    'Timeline de eventos por serviço. Lido pelo DispatchTrackingTimeline no Flutter via Supabase SDK + Realtime.';
COMMENT ON TABLE public.service_offers IS
    'Rastreamento de ofertas de serviço enviadas a prestadores durante o processo de dispatch.';
