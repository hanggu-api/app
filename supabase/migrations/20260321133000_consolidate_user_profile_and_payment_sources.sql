-- Consolidação de perfil/pagamento:
-- - users = fonte canônica de estado de negócio
-- - payment_accounts = dados técnicos de gateway
-- - user_profiles_complete = camada de compatibilidade (VIEW)

-- Ensure required canonical columns exist on users before consolidation/backfills.
-- (Some older schemas don't have these columns yet.)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS document_value text,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id text,
  ADD COLUMN IF NOT EXISTS asaas_status text;

-- Ensure documents_driver has the upload/path columns before building the compatibility VIEW.
ALTER TABLE IF EXISTS public.documents_driver
  ADD COLUMN IF NOT EXISTS selfie_path text,
  ADD COLUMN IF NOT EXISTS document_path text,
  ADD COLUMN IF NOT EXISTS document_mime text,
  ADD COLUMN IF NOT EXISTS document_filename text;

-- 1) Backfill canônico de vínculo/status Asaas em users usando payment_accounts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'payment_accounts'
  ) THEN
    UPDATE public.users u
    SET
      asaas_wallet_id = COALESCE(
        NULLIF(TRIM(u.asaas_wallet_id), ''),
        NULLIF(TRIM(pa.wallet_id), ''),
        NULLIF(TRIM(pa.external_id), '')
      ),
      asaas_status = CASE
        WHEN (
          CASE LOWER(COALESCE(pa.status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        ) > (
          CASE LOWER(COALESCE(u.asaas_status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        ) THEN LOWER(pa.status)
        ELSE u.asaas_status
      END,
      updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (user_id)
        user_id,
        wallet_id,
        external_id,
        status,
        updated_at,
        created_at
      FROM public.payment_accounts
      WHERE gateway_name = 'asaas'
      ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) pa
    WHERE u.id = pa.user_id
      AND (
        COALESCE(TRIM(u.asaas_wallet_id), '') = ''
        OR (
          CASE LOWER(COALESCE(pa.status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        ) > (
          CASE LOWER(COALESCE(u.asaas_status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        )
      );
  END IF;
END;
$$;

-- 2) Backfill complementar a partir da tabela legacy user_profiles_complete (se ainda for tabela)
DO $$
DECLARE
  v_relkind "char";
BEGIN
  SELECT c.relkind
    INTO v_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'user_profiles_complete'
  LIMIT 1;

  IF v_relkind = 'r' THEN
    -- Ensure columns exist on the legacy table so the backfill doesn't fail.
    ALTER TABLE public.user_profiles_complete
      ADD COLUMN IF NOT EXISTS asaas_wallet_id text,
      ADD COLUMN IF NOT EXISTS asaas_status text,
      ADD COLUMN IF NOT EXISTS full_name text,
      ADD COLUMN IF NOT EXISTS phone text,
      ADD COLUMN IF NOT EXISTS document_value text,
      ADD COLUMN IF NOT EXISTS birth_date date,
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS address_number text,
      ADD COLUMN IF NOT EXISTS province text,
      ADD COLUMN IF NOT EXISTS city text,
      ADD COLUMN IF NOT EXISTS state text,
      ADD COLUMN IF NOT EXISTS postal_code text,
      ADD COLUMN IF NOT EXISTS zip_code text,
      ADD COLUMN IF NOT EXISTS selfie_path text,
      ADD COLUMN IF NOT EXISTS document_path text,
      ADD COLUMN IF NOT EXISTS document_mime text,
      ADD COLUMN IF NOT EXISTS document_filename text;

    UPDATE public.users u
    SET
      asaas_wallet_id = COALESCE(NULLIF(TRIM(u.asaas_wallet_id), ''), NULLIF(TRIM(p.asaas_wallet_id), '')),
      asaas_status = CASE
        WHEN (
          CASE LOWER(COALESCE(p.asaas_status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        ) > (
          CASE LOWER(COALESCE(u.asaas_status, ''))
            WHEN 'active' THEN 3
            WHEN 'blocked' THEN 2
            WHEN 'pending' THEN 1
            ELSE 0
          END
        ) THEN LOWER(p.asaas_status)
        ELSE u.asaas_status
      END,
      full_name = COALESCE(NULLIF(TRIM(u.full_name), ''), NULLIF(TRIM(p.full_name), ''), u.full_name),
      phone = COALESCE(NULLIF(TRIM(u.phone), ''), NULLIF(TRIM(p.phone), ''), u.phone),
      document_value = COALESCE(NULLIF(TRIM(u.document_value), ''), NULLIF(TRIM(p.document_value), ''), u.document_value),
      birth_date = COALESCE(u.birth_date, p.birth_date),
      address = COALESCE(NULLIF(TRIM(u.address), ''), NULLIF(TRIM(p.address), ''), u.address),
      address_number = COALESCE(NULLIF(TRIM(u.address_number), ''), NULLIF(TRIM(p.address_number), ''), u.address_number),
      province = COALESCE(NULLIF(TRIM(u.province), ''), NULLIF(TRIM(p.province), ''), u.province),
      city = COALESCE(NULLIF(TRIM(u.city), ''), NULLIF(TRIM(p.city), ''), u.city),
      state = COALESCE(NULLIF(TRIM(u.state), ''), NULLIF(TRIM(p.state), ''), u.state),
      postal_code = COALESCE(NULLIF(TRIM(u.postal_code), ''), NULLIF(TRIM(p.postal_code), ''), NULLIF(TRIM(p.zip_code), ''), u.postal_code),
      updated_at = NOW()
    FROM public.user_profiles_complete p
    WHERE p.user_id = u.id;

    INSERT INTO public.documents_driver (
      user_id,
      selfie_path,
      document_path,
      document_mime,
      document_filename,
      updated_at
    )
    SELECT
      p.user_id,
      p.selfie_path,
      p.document_path,
      p.document_mime,
      p.document_filename,
      NOW()
    FROM public.user_profiles_complete p
    WHERE p.user_id IS NOT NULL
      AND (
        COALESCE(TRIM(p.selfie_path), '') <> ''
        OR COALESCE(TRIM(p.document_path), '') <> ''
      )
    ON CONFLICT (user_id) DO UPDATE
      SET
        selfie_path = COALESCE(EXCLUDED.selfie_path, documents_driver.selfie_path),
        document_path = COALESCE(EXCLUDED.document_path, documents_driver.document_path),
        document_mime = COALESCE(EXCLUDED.document_mime, documents_driver.document_mime),
        document_filename = COALESCE(EXCLUDED.document_filename, documents_driver.document_filename),
        updated_at = NOW();
  END IF;
END;
$$;

-- 3) Converter user_profiles_complete para VIEW de compatibilidade
DO $$
DECLARE
  v_relkind "char";
BEGIN
  SELECT c.relkind
    INTO v_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'user_profiles_complete'
  LIMIT 1;

  IF v_relkind = 'r' THEN
    EXECUTE format(
      'ALTER TABLE public.user_profiles_complete RENAME TO user_profiles_complete_legacy_%s',
      to_char(NOW(), 'YYYYMMDDHH24MISS')
    );
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.user_profiles_complete AS
SELECT
  u.id AS user_id,
  to_jsonb(u)->>'role' AS role,
  to_jsonb(u)->>'full_name' AS full_name,
  to_jsonb(u)->>'email' AS email,
  to_jsonb(u)->>'phone' AS phone,
  to_jsonb(u)->>'document_type' AS document_type,
  to_jsonb(u)->>'document_value' AS document_value,
  NULLIF(to_jsonb(u)->>'birth_date', '')::date AS birth_date,
  to_jsonb(u)->>'mobile_phone' AS mobile_phone,
  to_jsonb(u)->>'address' AS address,
  to_jsonb(u)->>'address_number' AS address_number,
  to_jsonb(u)->>'complement' AS complement,
  to_jsonb(u)->>'province' AS province,
  COALESCE(NULLIF(to_jsonb(u)->>'postal_code', ''), NULLIF(to_jsonb(u)->>'zip_code', '')) AS postal_code,
  COALESCE(NULLIF(to_jsonb(u)->>'zip_code', ''), NULLIF(to_jsonb(u)->>'postal_code', '')) AS zip_code,
  to_jsonb(u)->>'city' AS city,
  to_jsonb(u)->>'state' AS state,
  to_jsonb(u)->>'person_type' AS person_type,
  to_jsonb(u)->>'company_type' AS company_type,
  to_jsonb(u)->>'asaas_customer_id' AS asaas_customer_id,
  COALESCE(
    NULLIF(to_jsonb(u)->>'asaas_wallet_id', ''),
    NULLIF(pa.wallet_id, ''),
    NULLIF(pa.external_id, '')
  ) AS asaas_wallet_id,
  CASE
    WHEN (
      CASE LOWER(COALESCE(pa.status, ''))
        WHEN 'active' THEN 3
        WHEN 'blocked' THEN 2
        WHEN 'pending' THEN 1
        ELSE 0
      END
    ) > (
      CASE LOWER(COALESCE(to_jsonb(u)->>'asaas_status', ''))
        WHEN 'active' THEN 3
        WHEN 'blocked' THEN 2
        WHEN 'pending' THEN 1
        ELSE 0
      END
    ) THEN LOWER(pa.status)
    ELSE LOWER(COALESCE(to_jsonb(u)->>'asaas_status', ''))
  END AS asaas_status,
  to_jsonb(u)->>'stripe_customer_id' AS stripe_customer_id,
  to_jsonb(u)->>'stripe_account_id' AS stripe_account_id,
  to_jsonb(u)->>'pix_key' AS pix_key,
  to_jsonb(u)->>'preferred_payment_method' AS preferred_payment_method,
  to_jsonb(u)->>'is_active_uber' AS is_active_uber,
  to_jsonb(u)->>'is_active' AS is_active,
  to_jsonb(u)->>'accepts_pix_direct' AS accepts_pix_direct,
  to_jsonb(u)->>'accepts_card_machine' AS accepts_card_machine,
  dd.selfie_path,
  dd.document_path,
  dd.document_mime,
  dd.document_filename,
  COALESCE(dd.updated_at, pa.updated_at, NULLIF(to_jsonb(u)->>'updated_at', '')::timestamptz, NOW()) AS last_sync_at
FROM public.users u
LEFT JOIN LATERAL (
  SELECT
    wallet_id,
    external_id,
    status,
    updated_at
  FROM public.payment_accounts pa
  WHERE pa.user_id = u.id
    AND pa.gateway_name = 'asaas'
  ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC NULLS LAST
  LIMIT 1
) pa ON TRUE
LEFT JOIN public.documents_driver dd ON dd.user_id = u.id;

GRANT SELECT ON public.user_profiles_complete TO anon, authenticated, service_role;
