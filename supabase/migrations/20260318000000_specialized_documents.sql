-- Adicionar sub_role para categorização mais fina
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sub_role TEXT;

-- Comentário para documentar os sub_roles esperados
COMMENT ON COLUMN public.users.sub_role IS 'Sub-categorização do usuário. 
Para client: passenger, seeker. 
Para provider: fixed, mobile. 
Para driver: (vazio ou default)';

-- Criar tabela de documentos para Passageiros
CREATE TABLE IF NOT EXISTS public.documents_passenger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT, -- cpf, rg, etc
    document_value TEXT,
    verification_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_passenger_user UNIQUE(user_id)
);

-- Criar tabela de documentos para Contratantes (Seeker)
CREATE TABLE IF NOT EXISTS public.documents_seeker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT, -- cpf, cnpj
    document_value TEXT,
    business_name TEXT, -- para corporativos
    verification_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_seeker_user UNIQUE(user_id)
);

-- Criar tabela de documentos para Prestadores Fixos
CREATE TABLE IF NOT EXISTS public.documents_provider_fixed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT, -- cpf, cnpj
    document_value TEXT,
    business_license TEXT, -- alvará, etc
    address_proof_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_provider_fixed_user UNIQUE(user_id)
);

-- Criar tabela de documentos para Prestadores Móveis
CREATE TABLE IF NOT EXISTS public.documents_provider_mobile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT,
    document_value TEXT,
    verification_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_provider_mobile_user UNIQUE(user_id)
);

-- Criar tabela de documentos para Motoristas
CREATE TABLE IF NOT EXISTS public.documents_driver (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT DEFAULT 'cnh',
    document_value TEXT,
    cnh_number TEXT,
    cnh_category TEXT,
    verification_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_driver_user UNIQUE(user_id)
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.documents_passenger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_seeker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_provider_fixed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_provider_mobile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_driver ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS Básicas (Usuário vê seus próprios documentos)
DROP POLICY IF EXISTS "Users can view own passenger docs" ON public.documents_passenger;
CREATE POLICY "Users can view own passenger docs" ON public.documents_passenger FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = documents_passenger.user_id));

DROP POLICY IF EXISTS "Users can view own seeker docs" ON public.documents_seeker;
CREATE POLICY "Users can view own seeker docs" ON public.documents_seeker FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = documents_seeker.user_id));

DROP POLICY IF EXISTS "Users can view own fixed provider docs" ON public.documents_provider_fixed;
CREATE POLICY "Users can view own fixed provider docs" ON public.documents_provider_fixed FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = documents_provider_fixed.user_id));

DROP POLICY IF EXISTS "Users can view own mobile provider docs" ON public.documents_provider_mobile;
CREATE POLICY "Users can view own mobile provider docs" ON public.documents_provider_mobile FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = documents_provider_mobile.user_id));

DROP POLICY IF EXISTS "Users can view own driver docs" ON public.documents_driver;
CREATE POLICY "Users can view own driver docs" ON public.documents_driver FOR SELECT USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = documents_driver.user_id));
