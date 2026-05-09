-- Consultas prontas para operacao/admin da visao consolidada de contestacoes.

-- 1) Listar contestacoes mais recentes
SELECT
  dispute_id,
  service_id,
  client_name,
  provider_name,
  dispute_status,
  platform_decision,
  evidence_count,
  dispute_created_at
FROM public.service_disputes_admin_vw
ORDER BY dispute_created_at DESC
LIMIT 50;

-- 2) Buscar uma contestacao especifica por service_id
-- Troque <SERVICE_ID>
-- SELECT *
-- FROM public.service_disputes_admin_vw
-- WHERE service_id = '<SERVICE_ID>'::uuid;

-- 3) Buscar apenas contestacoes pendentes de decisao
-- SELECT
--   dispute_id,
--   service_id,
--   client_name,
--   provider_name,
--   dispute_reason,
--   evidence_count,
--   dispute_created_at
-- FROM public.service_disputes_admin_vw
-- WHERE platform_decision = 'pending'
-- ORDER BY dispute_created_at DESC;
