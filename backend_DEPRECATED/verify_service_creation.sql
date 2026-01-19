-- Query para verificar se serviço e appointment foram criados corretamente
-- Execute APÓS clicar em "Confirmar serviço"

-- 1. Verificar último serviço criado
SELECT 
    id,
    client_id,
    provider_id,
    status,
    scheduled_at,
    price_estimated,
    price_upfront,
    description,
    created_at
FROM service_requests 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Verificar se appointment foi criado automaticamente
SELECT 
    a.id,
    a.provider_id,
    a.client_id,
    a.service_request_id,
    a.status,
    a.start_time,
    a.end_time,
    a.created_at,
    sr.description as service_description
FROM appointments a
LEFT JOIN service_requests sr ON a.service_request_id = sr.id
ORDER BY a.created_at DESC 
LIMIT 1;

-- 3. Verificar se os dados estão linkados corretamente
SELECT 
    sr.id as service_id,
    sr.status as service_status,
    sr.scheduled_at,
    a.id as appointment_id,
    a.status as appointment_status,
    a.start_time,
    a.end_time
FROM service_requests sr
LEFT JOIN appointments a ON sr.id = a.service_request_id
WHERE sr.created_at > NOW() - INTERVAL 5 MINUTE
ORDER BY sr.created_at DESC;
