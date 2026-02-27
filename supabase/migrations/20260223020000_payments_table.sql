-- Migration: 20260223020000_payments_table.sql
-- Ajusta a tabela payments existente para integração com Mercado Pago

-- Adicionar colunas que podem estar faltando (IF NOT EXISTS para safe re-run)
DO $$
BEGIN
    -- service_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'service_id'
    ) THEN
        ALTER TABLE public.payments
        ADD COLUMN service_id UUID REFERENCES public.service_requests_new(id) ON DELETE SET NULL;
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;

    -- amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN amount NUMERIC(10, 2);
    END IF;

    -- payment_method
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_method TEXT;
    END IF;

    -- payment_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_type TEXT;
    END IF;

    -- mp_response
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'mp_response'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN mp_response JSONB;
    END IF;

    -- updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END;
$$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_service_id ON public.payments (service_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Dropar e recriar políticas para evitar conflito
DROP POLICY IF EXISTS "Usuário pode ver seus próprios pagamentos" ON public.payments;
DROP POLICY IF EXISTS "Service role pode gerenciar pagamentos" ON public.payments;

CREATE POLICY "Usuário pode ver seus próprios pagamentos"
    ON public.payments FOR SELECT
    USING (
        service_id IN (
            SELECT id FROM public.service_requests_new
            WHERE client_id::text = auth.uid()::text
               OR provider_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Service role pode gerenciar pagamentos"
    ON public.payments FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Adicionar payment_status em service_requests_new (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_requests_new' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.service_requests_new
        ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
END;
$$;
