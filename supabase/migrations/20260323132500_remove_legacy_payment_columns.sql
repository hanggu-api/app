-- Remove colunas de métodos de pagamento legados (Asaas, Stripe, Pagar.me)

-- Triggers dependem de colunas legadas (ex.: stripe_customer_id/stripe_account_id).
-- Remover triggers antes de dropar as colunas para evitar erro de dependência.
DROP TRIGGER IF EXISTS tr_stripe_customer_auto_onboarding ON public.users;
DROP TRIGGER IF EXISTS tr_sync_stripe_customer_id ON public.users;
DROP TRIGGER IF EXISTS tr_stripe_auto_onboarding ON public.providers;
DROP TRIGGER IF EXISTS tr_sync_stripe_account_id ON public.providers;

-- Tabela: user_payment_methods
ALTER TABLE public.user_payment_methods
  DROP COLUMN IF EXISTS stripe_payment_method_id,
  DROP COLUMN IF EXISTS asaas_card_token,
  DROP COLUMN IF EXISTS pagarme_card_id;

-- Tabela: users
ALTER TABLE public.users
  DROP COLUMN IF EXISTS asaas_customer_id,
  DROP COLUMN IF EXISTS asaas_wallet_id,
  DROP COLUMN IF EXISTS asaas_status,
  DROP COLUMN IF EXISTS stripe_customer_id;

-- Tabela: providers
ALTER TABLE public.providers
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_completed;

-- Tabela: payments
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS asaas_payment_id,
  DROP COLUMN IF EXISTS asaas_status;

-- Tabela: payment_accounts (Totalmente dependente de gateways externos genéricos que não o nativo)
DROP TABLE IF EXISTS public.payment_accounts CASCADE;

-- Recriar a view user_profiles_complete omitindo essas colunas, que dependiam de users e payment_accounts
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
  COALESCE(dd.updated_at, NULLIF(to_jsonb(u)->>'updated_at', '')::timestamptz, NOW()) AS last_sync_at
FROM public.users u
LEFT JOIN public.documents_driver dd ON dd.user_id = u.id;

GRANT SELECT ON public.user_profiles_complete TO anon, authenticated, service_role;
