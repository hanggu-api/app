    -- Adiciona coluna pix_key na tabela users para armazenar a chave PIX do motorista
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pix_key TEXT;

    -- Adiciona colunas de preferências de trabalho do motorista
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accepts_rides BOOLEAN DEFAULT true;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accepts_services BOOLEAN DEFAULT false;

    -- STATUS ATIVO/INATIVO do motorista (separado de login)
    -- is_active = true quando o motorista apertou o botão Play (disponível para corridas)
    -- activated_at = timestamp de quando ficou ativo pela última vez (para monitorar tempo de atividade)
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

    -- Comentários descritivos
    COMMENT ON COLUMN public.users.pix_key IS 'Chave PIX do motorista para recebimento direto de pagamentos';
    COMMENT ON COLUMN public.users.accepts_rides IS 'Motorista aceita receber corridas';
    COMMENT ON COLUMN public.users.accepts_services IS 'Motorista aceita receber serviços fixos';
    COMMENT ON COLUMN public.users.is_active IS 'Motorista está disponível para corridas (botão Play ativado)';
    COMMENT ON COLUMN public.users.activated_at IS 'Timestamp de quando o motorista ficou ativo pela última vez';
