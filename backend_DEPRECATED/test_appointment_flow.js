/**
 * Script de Teste Automatizado - Fluxo de Agendamento
 * 
 * Executa testes completos e mostra resultados no terminal
 * Se falhar, indica o que precisa ser corrigido
 * 
 * Executar: node test_appointment_flow.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Cores para terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`   ${message}`, 'blue');
}

async function runTest() {
    let connection;
    let serviceId = null;
    let appointmentId = null;

    try {
        log('\n🧪 ========================================', 'bright');
        log('🧪 TESTE AUTOMATIZADO - FLUXO DE AGENDAMENTO', 'bright');
        log('🧪 ========================================\n', 'bright');

        // Conectar ao banco
        logStep(1, 'Conectando ao banco de dados...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'app',
            port: process.env.DB_PORT || 3306
        });
        logSuccess('Conectado ao banco de dados');

        // Buscar usuários de teste
        logStep(2, 'Buscando usuários de teste...');
        const [clients] = await connection.query(
            'SELECT id, full_name FROM users WHERE role = "client" LIMIT 1'
        );
        const [providers] = await connection.query(
            'SELECT id, full_name FROM users WHERE role = "provider" LIMIT 1'
        );

        if (clients.length === 0 || providers.length === 0) {
            logError('Necessário ter pelo menos 1 cliente e 1 provider no banco');
            throw new Error('Usuários de teste não encontrados');
        }

        const clientId = clients[0].id;
        const providerId = providers[0].id;
        logSuccess(`Cliente: ${clients[0].full_name} (ID: ${clientId})`);
        logSuccess(`Provider: ${providers[0].full_name} (ID: ${providerId})`);

        // Criar serviço
        logStep(3, 'Criando serviço com agendamento...');
        serviceId = uuidv4();
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + 2);

        await connection.query(
            `INSERT INTO service_requests 
       (id, client_id, category_id, profession, description, latitude, longitude, 
        address, price_estimated, price_upfront, status, scheduled_at, location_type, 
        validation_code, status_updated_at, provider_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [
                serviceId,
                clientId,
                1,
                'Barbeiro',
                'Teste automatizado - Corte + Barba',
                -23.550520,
                -46.633308,
                'Endereço de Teste, 123',
                80.00,
                24.00,
                'waiting_payment',
                scheduledAt,
                'provider',
                '1234',
                providerId
            ]
        );
        logSuccess(`Serviço criado: ${serviceId}`);
        logInfo(`Agendado para: ${scheduledAt.toLocaleString('pt-BR')}`);

        // Criar appointment
        logStep(4, 'Criando appointment com status waiting_payment...');
        const endTime = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

        try {
            const [appointmentResult] = await connection.query(
                `INSERT INTO appointments 
         (provider_id, client_id, service_request_id, start_time, end_time, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    providerId,
                    clientId,
                    serviceId,
                    scheduledAt,
                    endTime,
                    'waiting_payment',
                    'Teste: Corte + Barba'
                ]
            );
            appointmentId = appointmentResult.insertId;
            logSuccess(`Appointment criado: ID ${appointmentId}`);
            logInfo(`Status: waiting_payment`);
        } catch (error) {
            if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.errno === 1265) {
                logError('Coluna status não aceita "waiting_payment"');
                logError('CORREÇÃO NECESSÁRIA: Execute a migração do banco de dados');
                log('\nExecute este comando SQL:', 'yellow');
                log('ALTER TABLE appointments MODIFY COLUMN status ENUM(\'scheduled\', \'completed\', \'cancelled\', \'busy\', \'waiting_payment\') NOT NULL DEFAULT \'scheduled\';', 'yellow');
                throw new Error('Migração de banco de dados necessária');
            }
            throw error;
        }

        // Verificar appointment criado
        logStep(5, 'Verificando appointment no banco...');
        const [appointments1] = await connection.query(
            'SELECT * FROM appointments WHERE id = ?',
            [appointmentId]
        );

        if (appointments1.length === 0) {
            logError('Appointment não encontrado!');
            throw new Error('Appointment não foi criado');
        }

        logSuccess('Appointment encontrado:');
        logInfo(`ID: ${appointments1[0].id}`);
        logInfo(`Status: ${appointments1[0].status}`);
        logInfo(`Provider ID: ${appointments1[0].provider_id}`);
        logInfo(`Client ID: ${appointments1[0].client_id}`);
        logInfo(`Service Request ID: ${appointments1[0].service_request_id}`);
        logInfo(`Start Time: ${new Date(appointments1[0].start_time).toLocaleString('pt-BR')}`);
        logInfo(`End Time: ${new Date(appointments1[0].end_time).toLocaleString('pt-BR')}`);

        if (appointments1[0].status !== 'waiting_payment') {
            logError(`Status incorreto! Esperado: waiting_payment, Recebido: ${appointments1[0].status}`);
            throw new Error('Status do appointment incorreto');
        }

        // Simular confirmação de pagamento
        logStep(6, 'Simulando confirmação de pagamento...');
        await connection.query(
            `UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE service_request_id = ?`,
            ['scheduled', serviceId]
        );
        logSuccess('Status do appointment atualizado');

        // Verificar appointment atualizado
        logStep(7, 'Verificando appointment após pagamento...');
        const [appointments2] = await connection.query(
            'SELECT * FROM appointments WHERE id = ?',
            [appointmentId]
        );

        logSuccess('Appointment após pagamento:');
        logInfo(`ID: ${appointments2[0].id}`);
        logInfo(`Status: ${appointments2[0].status}`);
        logInfo(`Updated At: ${new Date(appointments2[0].updated_at).toLocaleString('pt-BR')}`);

        if (appointments2[0].status !== 'scheduled') {
            logError(`Status não atualizado! Esperado: scheduled, Recebido: ${appointments2[0].status}`);
            throw new Error('Status do appointment não foi atualizado');
        }

        // Limpar dados de teste
        logStep(8, 'Limpando dados de teste...');
        await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        await connection.query('DELETE FROM service_requests WHERE id = ?', [serviceId]);
        logSuccess('Dados de teste removidos');

        // Resultado final
        log('\n🎉 ========================================', 'green');
        log('🎉 TESTE CONCLUÍDO COM SUCESSO!', 'green');
        log('🎉 ========================================\n', 'green');

        log('✅ Todos os passos funcionaram corretamente:', 'green');
        log('   1. ✅ Serviço criado com provider_id e scheduled_at', 'green');
        log('   2. ✅ Appointment criado com status "waiting_payment"', 'green');
        log('   3. ✅ Pagamento simulado', 'green');
        log('   4. ✅ Appointment atualizado para status "scheduled"', 'green');
        log('\n🚀 O fluxo de agendamento está funcionando perfeitamente!\n', 'green');

        process.exit(0);

    } catch (error) {
        log('\n❌ ========================================', 'red');
        log('❌ ERRO NO TESTE', 'red');
        log('❌ ========================================', 'red');
        log(`\n❌ ${error.message}\n`, 'red');

        if (error.stack) {
            log('Stack trace:', 'yellow');
            console.log(error.stack);
        }

        // Limpar dados de teste em caso de erro
        if (connection) {
            try {
                if (appointmentId) {
                    await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
                }
                if (serviceId) {
                    await connection.query('DELETE FROM service_requests WHERE id = ?', [serviceId]);
                }
                log('\n🧹 Dados de teste removidos após erro\n', 'yellow');
            } catch (cleanupError) {
                log('Erro ao limpar dados de teste:', 'red');
                console.error(cleanupError);
            }
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            log('📡 Conexão com banco fechada.\n', 'blue');
        }
    }
}

// Executar teste
runTest();
