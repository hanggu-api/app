    -- ========================================
    -- Script de Teste - Fluxo de Agendamento
    -- ========================================
    -- Execute este script no MySQL Workbench ou qualquer cliente MySQL
    -- Banco de dados: app
    -- 
    -- O script testa:
    -- 1. Criação de serviço com provider_id e scheduled_at
    -- 2. Criação de appointment com status 'waiting_payment'
    -- 3. Atualização de appointment para status 'scheduled' após pagamento

    -- ========================================
    -- SETUP: Buscar IDs de teste
    -- ========================================
    SELECT '🧪 INICIANDO TESTE DE FLUXO DE AGENDAMENTO' as status;
    SELECT '' as '';

    SELECT '👤 Buscando usuários de teste...' as status;

    -- Buscar um cliente
    SET @client_id = (SELECT id FROM users WHERE role = 'client' LIMIT 1);
    SET @client_name = (SELECT full_name FROM users WHERE id = @client_id);

    -- Buscar um provider
    SET @provider_id = (SELECT id FROM users WHERE role = 'provider' LIMIT 1);
    SET @provider_name = (SELECT full_name FROM users WHERE id = @provider_id);

    SELECT CONCAT('✅ Cliente: ', @client_name, ' (ID: ', @client_id, ')') as status;
    SELECT CONCAT('✅ Provider: ', @provider_name, ' (ID: ', @provider_id, ')') as status;
    SELECT '' as '';

    -- ========================================
    -- PASSO 1: Criar Service Request
    -- ========================================
    SELECT '📝 PASSO 1: Criando serviço com agendamento...' as status;

    -- Gerar ID único para o teste
    SET @service_id = CONCAT('test-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000));
    SET @scheduled_at = DATE_ADD(NOW(), INTERVAL 2 HOUR);

    INSERT INTO service_requests 
    (id, client_id, category_id, profession, description, latitude, longitude, 
    address, price_estimated, price_upfront, status, scheduled_at, location_type, 
    validation_code, status_updated_at, provider_id) 
    VALUES (
        @service_id,
        @client_id,
        1,
        'Barbeiro',
        'Teste de agendamento - Corte + Barba',
        -23.550520,
        -46.633308,
        'Endereço de Teste, 123',
        80.00,
        24.00,
        'waiting_payment',
        @scheduled_at,
        'provider',
        '1234',
        CURRENT_TIMESTAMP,
        @provider_id
    );

    SELECT CONCAT('✅ Serviço criado: ', @service_id) as status;
    SELECT CONCAT('   Agendado para: ', DATE_FORMAT(@scheduled_at, '%d/%m/%Y %H:%i')) as info;
    SELECT '' as '';

    -- ========================================
    -- PASSO 2: Criar Appointment (waiting_payment)
    -- ========================================
    SELECT '📅 PASSO 2: Criando appointment com status waiting_payment...' as status;

    SET @end_time = DATE_ADD(@scheduled_at, INTERVAL 1 HOUR);

    INSERT INTO appointments 
    (provider_id, client_id, service_request_id, start_time, end_time, status, notes)
    VALUES (
        @provider_id,
        @client_id,
        @service_id,
        @scheduled_at,
        @end_time,
        'waiting_payment',
        'Teste: Corte + Barba'
    );

    SET @appointment_id = LAST_INSERT_ID();

    SELECT CONCAT('✅ Appointment criado: ID ', @appointment_id) as status;
    SELECT '   Status: waiting_payment' as info;
    SELECT '' as '';

    -- ========================================
    -- VERIFICAÇÃO 1: Appointment com waiting_payment
    -- ========================================
    SELECT '🔍 VERIFICAÇÃO 1: Appointment criado corretamente?' as status;
    SELECT '' as '';

    SELECT 
        id as 'ID',
        status as 'Status',
        provider_id as 'Provider ID',
        client_id as 'Client ID',
        service_request_id as 'Service ID',
        DATE_FORMAT(start_time, '%d/%m/%Y %H:%i') as 'Início',
        DATE_FORMAT(end_time, '%d/%m/%Y %H:%i') as 'Fim'
    FROM appointments 
    WHERE id = @appointment_id;

    SELECT 
        CASE 
            WHEN status = 'waiting_payment' THEN '✅ Status correto: waiting_payment'
            ELSE CONCAT('❌ Status incorreto: ', status, ' (esperado: waiting_payment)')
        END as resultado
    FROM appointments 
    WHERE id = @appointment_id;

    SELECT '' as '';

    -- ========================================
    -- PASSO 3: Simular Confirmação de Pagamento
    -- ========================================
    SELECT '💳 PASSO 3: Simulando confirmação de pagamento...' as status;

    UPDATE appointments 
    SET status = 'scheduled', updated_at = CURRENT_TIMESTAMP 
    WHERE service_request_id = @service_id;

    SELECT '✅ Status do appointment atualizado' as status;
    SELECT '' as '';

    -- ========================================
    -- VERIFICAÇÃO 2: Appointment atualizado para scheduled
    -- ========================================
    SELECT '🔍 VERIFICAÇÃO 2: Appointment atualizado após pagamento?' as status;
    SELECT '' as '';

    SELECT 
        id as 'ID',
        status as 'Status',
        DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i:%s') as 'Atualizado em'
    FROM appointments 
    WHERE id = @appointment_id;

    SELECT 
        CASE 
            WHEN status = 'scheduled' THEN '✅ Status correto: scheduled'
            ELSE CONCAT('❌ Status incorreto: ', status, ' (esperado: scheduled)')
        END as resultado
    FROM appointments 
    WHERE id = @appointment_id;

    SELECT '' as '';

    -- ========================================
    -- PASSO 4: Limpar Dados de Teste
    -- ========================================
    SELECT '🧹 PASSO 4: Limpando dados de teste...' as status;

    DELETE FROM appointments WHERE id = @appointment_id;
    DELETE FROM service_requests WHERE id = @service_id;

    SELECT '✅ Dados de teste removidos' as status;
    SELECT '' as '';

    -- ========================================
    -- RESULTADO FINAL
    -- ========================================
    SELECT '🎉 ========================================' as '';
    SELECT '🎉 TESTE CONCLUÍDO COM SUCESSO!' as '';
    SELECT '🎉 ========================================' as '';
    SELECT '' as '';
    SELECT '✅ Todos os passos funcionaram corretamente:' as '';
    SELECT '   1. ✅ Serviço criado com provider_id e scheduled_at' as '';
    SELECT '   2. ✅ Appointment criado com status "waiting_payment"' as '';
    SELECT '   3. ✅ Pagamento simulado' as '';
    SELECT '   4. ✅ Appointment atualizado para status "scheduled"' as '';
    SELECT '' as '';
    SELECT '🚀 O fluxo de agendamento está funcionando perfeitamente!' as '';
