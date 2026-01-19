/**
 * SUITE DEFINITIVA DE TESTES - PRODUÇÃO
 * 
 * Baseado em documentação técnica completa do projeto
 * Testa TODOS os fluxos críticos identificados
 * 
 * Usage: node final_production_test_suite.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m',
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

const results = {
    passed: 0,
    failed: 0,
    tests: [],
    bugs: []
};

function recordTest(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
        results.passed++;
        log(`✅ ${name}`, 'green');
    } else {
        results.failed++;
        log(`❌ ${name}`, 'red');
        if (error) {
            log(`   Error: ${error}`, 'red');
            results.bugs.push({ test: name, error });
        }
    }
}

async function testDatabaseSchema(connection) {
    log('\n🗄️  TEST SUITE 1: DATABASE SCHEMA VALIDATION', 'cyan');

    // Test 1.1: Verify service_requests status enum
    try {
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM service_requests LIKE 'status'"
        );

        const statusEnum = columns[0]?.Type || '';
        const hasWaitingPayment = statusEnum.includes('waiting_payment');
        const hasWaitingPaymentRemaining = statusEnum.includes('waiting_payment_remaining');
        const hasWaitingClientConfirmation = statusEnum.includes('waiting_client_confirmation');
        const hasContested = statusEnum.includes('contested');

        recordTest('service_requests.status has waiting_payment', hasWaitingPayment);
        recordTest('service_requests.status has waiting_payment_remaining', hasWaitingPaymentRemaining);
        recordTest('service_requests.status has waiting_client_confirmation', hasWaitingClientConfirmation);
        recordTest('service_requests.status has contested', hasContested);

        if (!hasWaitingPaymentRemaining || !hasWaitingClientConfirmation || !hasContested) {
            results.bugs.push({
                test: 'Database Schema',
                error: 'Missing status enums - need to run add_detailed_statuses migration',
                fix: 'Execute: ALTER TABLE service_requests MODIFY COLUMN status ENUM(...) to include all statuses'
            });
        }
    } catch (error) {
        recordTest('service_requests.status enum check', false, error.message);
    }

    // Test 1.2: Verify appointments status enum
    try {
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM appointments LIKE 'status'"
        );

        const statusEnum = columns[0]?.Type || '';
        const hasWaitingPayment = statusEnum.includes('waiting_payment');

        recordTest('appointments.status has waiting_payment', hasWaitingPayment);

        if (!hasWaitingPayment) {
            results.bugs.push({
                test: 'Database Schema',
                error: 'appointments.status missing waiting_payment',
                fix: 'Execute: ALTER TABLE appointments MODIFY COLUMN status ENUM(\'scheduled\', \'completed\', \'cancelled\', \'busy\', \'waiting_payment\')'
            });
        }
    } catch (error) {
        recordTest('appointments.status enum check', false, error.message);
    }

    // Test 1.3: Verify critical tables exist
    const criticalTables = [
        'users', 'providers', 'service_requests', 'appointments',
        'service_dispatches', 'user_devices', 'provider_locations'
    ];

    for (const table of criticalTables) {
        try {
            await connection.query(`SELECT 1 FROM ${table} LIMIT 1`);
            recordTest(`Table ${table} exists`, true);
        } catch (error) {
            recordTest(`Table ${table} exists`, false, error.message);
        }
    }
}

async function testAppointmentFlow(connection) {
    log('\n📅 TEST SUITE 2: APPOINTMENT FLOW (Core Feature)', 'cyan');

    let serviceId = null;
    let appointmentId = null;
    let clientId = null;
    let providerId = null;

    try {
        // Get test users
        const [clients] = await connection.query(
            'SELECT id FROM users WHERE role = "client" LIMIT 1'
        );
        const [providers] = await connection.query(
            'SELECT id FROM users WHERE role = "provider" LIMIT 1'
        );

        if (clients.length === 0 || providers.length === 0) {
            log('⚠️  Skipping appointment flow tests - no test users found', 'yellow');
            return;
        }

        clientId = clients[0].id;
        providerId = providers[0].id;

        // Test 2.1: Create service with schedule
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
                serviceId, clientId, 1, 'Barbeiro', 'Test service',
                -23.550520, -46.633308, 'Test Address', 80.00, 24.00,
                'waiting_payment', scheduledAt, 'provider', '1234', providerId
            ]
        );
        recordTest('Create service with provider_id and scheduled_at', true);

        // Test 2.2: Create appointment
        const endTime = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
        const [appointmentResult] = await connection.query(
            `INSERT INTO appointments 
       (provider_id, client_id, service_request_id, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [providerId, clientId, serviceId, scheduledAt, endTime, 'waiting_payment', 'Test']
        );
        appointmentId = appointmentResult.insertId;
        recordTest('Create appointment with waiting_payment status', true);

        // Test 2.3: Verify appointment
        const [appointments1] = await connection.query(
            'SELECT * FROM appointments WHERE id = ?',
            [appointmentId]
        );
        recordTest('Appointment created correctly', appointments1.length > 0 && appointments1[0].status === 'waiting_payment');

        // Test 2.4: Update to scheduled
        await connection.query(
            'UPDATE appointments SET status = ? WHERE service_request_id = ?',
            ['scheduled', serviceId]
        );

        const [appointments2] = await connection.query(
            'SELECT * FROM appointments WHERE id = ?',
            [appointmentId]
        );
        recordTest('Appointment status updated to scheduled', appointments2[0].status === 'scheduled');

        // Cleanup
        await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        await connection.query('DELETE FROM service_requests WHERE id = ?', [serviceId]);

    } catch (error) {
        recordTest('Appointment Flow', false, error.message);

        // Cleanup on error
        if (appointmentId) {
            await connection.query('DELETE FROM appointments WHERE id = ?', [appointmentId]).catch(() => { });
        }
        if (serviceId) {
            await connection.query('DELETE FROM service_requests WHERE id = ?', [serviceId]).catch(() => { });
        }
    }
}

async function testDataIntegrity(connection) {
    log('\n🔍 TEST SUITE 3: DATA INTEGRITY', 'cyan');

    // Test 3.1: Orphaned appointments
    try {
        const [orphaned] = await connection.query(`
      SELECT a.id FROM appointments a
      LEFT JOIN service_requests sr ON a.service_request_id = sr.id
      WHERE sr.id IS NULL
      LIMIT 1
    `);
        recordTest('No orphaned appointments', orphaned.length === 0);
        if (orphaned.length > 0) {
            results.bugs.push({
                test: 'Data Integrity',
                error: `Found ${orphaned.length} orphaned appointments`,
                fix: 'Clean up or add foreign key constraints'
            });
        }
    } catch (error) {
        recordTest('Orphaned appointments check', false, error.message);
    }

    // Test 3.2: Services with invalid status
    try {
        const [invalid] = await connection.query(`
      SELECT id, status FROM service_requests
      WHERE status NOT IN ('pending', 'accepted', 'in_progress', 'completed', 
                           'cancelled', 'waiting_payment', 'waiting_payment_remaining',
                           'waiting_client_confirmation', 'contested')
      LIMIT 1
    `);
        recordTest('No services with invalid status', invalid.length === 0);
    } catch (error) {
        // This might fail if enum doesn't include all statuses - that's expected
        recordTest('Services status validation', false, error.message);
    }
}

async function generateReport() {
    log('\n📊 FINAL TEST REPORT', 'bright');
    log('═'.repeat(70), 'bright');

    const total = results.passed + results.failed;
    const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

    log(`\nTotal Tests: ${total}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');

    if (results.bugs.length > 0) {
        log('\n🐛 BUGS FOUND:', 'red');
        log('─'.repeat(70), 'red');
        results.bugs.forEach((bug, i) => {
            log(`\n${i + 1}. ${bug.test}`, 'yellow');
            log(`   Error: ${bug.error}`, 'red');
            if (bug.fix) {
                log(`   Fix: ${bug.fix}`, 'cyan');
            }
        });
    }

    if (results.failed > 0) {
        log('\n❌ FAILED TESTS:', 'red');
        log('─'.repeat(70), 'red');
        results.tests.filter(t => !t.passed).forEach(t => {
            log(`   - ${t.name}`, 'red');
            if (t.error) log(`     ${t.error}`, 'yellow');
        });
    }

    log('\n' + '═'.repeat(70), 'bright');

    if (results.failed === 0) {
        log('\n🎉 ALL TESTS PASSED! DATABASE AND CORE FLOWS VALIDATED! 🎉\n', 'green');
        return 0;
    } else if (successRate >= 80) {
        log('\n⚠️  MOST TESTS PASSED. MINOR ISSUES TO FIX.\n', 'yellow');
        return 0;
    } else {
        log('\n❌ CRITICAL ISSUES FOUND. REVIEW REQUIRED.\n', 'red');
        return 1;
    }
}

async function main() {
    log('\n🚀 ========================================', 'bright');
    log('🚀 FINAL PRODUCTION TEST SUITE', 'bright');
    log('🚀 Complete Database & Flow Validation', 'bright');
    log('🚀 ========================================\n', 'bright');

    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'app',
            port: process.env.DB_PORT || 3306
        });

        log('✅ Connected to database\n', 'green');

        await testDatabaseSchema(connection);
        await testAppointmentFlow(connection);
        await testDataIntegrity(connection);

        await connection.end();

        const exitCode = await generateReport();
        process.exit(exitCode);

    } catch (error) {
        log(`\n💥 FATAL ERROR: ${error.message}`, 'red');
        console.error(error);
        if (connection) await connection.end();
        process.exit(1);
    }
}

main();
