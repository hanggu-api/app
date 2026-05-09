-- Campos mínimos para onboarding Asaas (PF) + upload de documentos

-- 1) Users: dados pessoais e endereço estruturado
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 2) user_profiles_complete (se existir): espelha os campos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles_complete'
  ) THEN
    ALTER TABLE public.user_profiles_complete
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS address_number TEXT,
      ADD COLUMN IF NOT EXISTS complement TEXT,
      ADD COLUMN IF NOT EXISTS province TEXT,
      ADD COLUMN IF NOT EXISTS postal_code TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS selfie_path TEXT,
      ADD COLUMN IF NOT EXISTS document_path TEXT,
      ADD COLUMN IF NOT EXISTS document_mime TEXT,
      ADD COLUMN IF NOT EXISTS document_filename TEXT;
  END IF;
END;
$$;

-- 3) documents_driver: armazenar paths do documento/selfie
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'documents_driver'
  ) THEN
    ALTER TABLE public.documents_driver
      ADD COLUMN IF NOT EXISTS selfie_path TEXT,
      ADD COLUMN IF NOT EXISTS document_path TEXT,
      ADD COLUMN IF NOT EXISTS document_mime TEXT,
      ADD COLUMN IF NOT EXISTS document_filename TEXT;
  END IF;
END;
$$;
