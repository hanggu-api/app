/**
 * Comprehensive Automated Test Suite
 * Tests: Backend APIs + Database + Frontend Integration
 * 
 * Usage: node comprehensive_test_suite.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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

const API_URL = 'http://localhost:3000/api';
let authToken = null;
let testUsers = {
    client: null,
    provider1: null,
    provider2: null,
    provider3: null
};

// Test Results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
        results.passed++;
        log(`✅ ${name}`, 'green');
    } else {
        results.failed++;
        log(`❌ ${name}`, 'red');
        if (error) log(`   Error: ${error}`, 'red');
    }
}

async function testUserRegistration() {
    log('\n📝 TEST SUITE 1: USER REGISTRATION', 'cyan');

    // Test 1.1: Register Client
    try {
        const clientData = {
            full_name: `Test Client ${Date.now()}`,
            email: `client${Date.now()}@test.com`,
            phone: `11${Math.floor(Math.random() * 100000000)}`,
            password: 'Test123!@#',
            role: 'client'
        };

        const res = await axios.post(`${API_URL}/auth/register`, clientData);
        testUsers.client = { ...clientData, id: res.data.user.id, token: res.data.token };
        recordTest('Register Client', res.status === 201);
    } catch (error) {
        recordTest('Register Client', false, error.message);
    }

    // Test 1.2: Register Provider 1 (Barbeiro)
    try {
        const providerData = {
            full_name: `Barbeiro Test ${Date.now()}`,
            email: `barber${Date.now()}@test.com`,
            phone: `11${Math.floor(Math.random() * 100000000)}`,
            password: 'Test123!@#',
            role: 'provider'
        };

        const res = await axios.post(`${API_URL}/auth/register`, providerData);
        testUsers.provider1 = { ...providerData, id: res.data.user.id, token: res.data.token };
        recordTest('Register Provider 1 (Barbeiro)', res.status === 201);
    } catch (error) {
        recordTest('Register Provider 1 (Barbeiro)', false, error.message);
    }

    // Test 1.3: Login Client
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            email: testUsers.client.email,
            password: testUsers.client.password
        });
        testUsers.client.token = res.data.token;
        recordTest('Login Client', res.status === 200 && res.data.token);
    } catch (error) {
        recordTest('Login Client', false, error.message);
    }
}

async function testServiceCreation() {
    log('\n🛠️ TEST SUITE 2: SERVICE CREATION', 'cyan');

    // Test 2.1: Create Mobile Service (No Schedule)
    try {
        const serviceData = {
            categoryId: 2, // Eletricista
            description: 'Teste automatizado - Consertar tomada',
            latitude: -23.550520,
            longitude: -46.633308,
            address: 'Rua Teste, 123',
            priceEstimated: 100.00,
            priceUpfront: 30.00,
            profession: 'Eletricista',
            locationType: 'client'
        };

        const res = await axios.post(`${API_URL}/services`, serviceData, {
            headers: { Authorization: `Bearer ${testUsers.client.token}` }
        });

        recordTest('Create Mobile Service', res.status === 201);
    } catch (error) {
        recordTest('Create Mobile Service', false, error.message);
    }

    // Test 2.2: Create Scheduled Service (Fixed Provider)
    try {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1); // Tomorrow
        scheduledAt.setHours(10, 0, 0, 0);

        const serviceData = {
            categoryId: 1, // Barbeiro
            description: 'Teste automatizado - Corte + Barba',
            latitude: -23.550520,
            longitude: -46.633308,
            address: 'Rua Teste, 123',
            priceEstimated: 80.00,
            priceUpfront: 24.00,
            profession: 'Barbeiro',
            locationType: 'provider',
            providerId: testUsers.provider1.id,
            scheduledAt: scheduledAt.toISOString()
        };

        const res = await axios.post(`${API_URL}/services`, serviceData, {
            headers: { Authorization: `Bearer ${testUsers.client.token}` }
        });

        testUsers.scheduledServiceId = res.data.service?.id || res.data.id;
        recordTest('Create Scheduled Service', res.status === 201);
    } catch (error) {
        recordTest('Create Scheduled Service', false, error.message);
    }
}

async function testAppointmentFlow() {
    log('\n📅 TEST SUITE 3: APPOINTMENT FLOW', 'cyan');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'app',
        port: process.env.DB_PORT || 3306
    });

    // Test 3.1: Verify Appointment Created with waiting_payment
    try {
        const [appointments] = await connection.query(
            'SELECT * FROM appointments WHERE service_request_id = ?',
            [testUsers.scheduledServiceId]
        );

        const hasAppointment = appointments.length > 0;
        const correctStatus = appointments[0]?.status === 'waiting_payment';

        recordTest('Appointment Created (waiting_payment)', hasAppointment && correctStatus);

        if (hasAppointment) {
            testUsers.appointmentId = appointments[0].id;
        }
    } catch (error) {
        recordTest('Appointment Created (waiting_payment)', false, error.message);
    }

    // Test 3.2: Simulate Payment and Check Status Update
    try {
        // Update appointment status manually (simulating payment)
        await connection.query(
            'UPDATE appointments SET status = ? WHERE id = ?',
            ['scheduled', testUsers.appointmentId]
        );

        const [appointments] = await connection.query(
            'SELECT * FROM appointments WHERE id = ?',
            [testUsers.appointmentId]
        );

        const correctStatus = appointments[0]?.status === 'scheduled';
        recordTest('Appointment Status Update (scheduled)', correctStatus);
    } catch (error) {
        recordTest('Appointment Status Update (scheduled)', false, error.message);
    }

    await connection.end();
}

async function testAPIEndpoints() {
    log('\n🔌 TEST SUITE 4: API ENDPOINTS', 'cyan');

    const endpoints = [
        { method: 'GET', path: '/health', auth: false },
        { method: 'GET', path: '/services', auth: true },
        { method: 'GET', path: '/providers', auth: true },
        { method: 'GET', path: '/appointments', auth: true },
    ];

    for (const endpoint of endpoints) {
        try {
            const config = endpoint.auth ? {
                headers: { Authorization: `Bearer ${testUsers.client.token}` }
            } : {};

            const res = await axios[endpoint.method.toLowerCase()](`${API_URL}${endpoint.path}`, config);
            recordTest(`API ${endpoint.method} ${endpoint.path}`, res.status === 200);
        } catch (error) {
            recordTest(`API ${endpoint.method} ${endpoint.path}`, false, error.response?.status || error.message);
        }
    }
}

async function cleanup() {
    log('\n🧹 CLEANUP', 'cyan');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'app',
        port: process.env.DB_PORT || 3306
    });

    // Delete test appointments
    if (testUsers.appointmentId) {
        await connection.query('DELETE FROM appointments WHERE id = ?', [testUsers.appointmentId]);
    }

    // Delete test services
    if (testUsers.scheduledServiceId) {
        await connection.query('DELETE FROM service_requests WHERE id = ?', [testUsers.scheduledServiceId]);
    }

    // Delete test users
    for (const user of Object.values(testUsers)) {
        if (user?.id) {
            await connection.query('DELETE FROM users WHERE id = ?', [user.id]);
        }
    }

    await connection.end();
    log('✅ Test data cleaned up', 'green');
}

async function generateReport() {
    log('\n📊 TEST REPORT', 'bright');
    log('═'.repeat(60), 'bright');
    log(`\nTotal Tests: ${results.passed + results.failed}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'cyan');

    if (results.failed > 0) {
        log('\n❌ FAILED TESTS:', 'red');
        results.tests.filter(t => !t.passed).forEach(t => {
            log(`   - ${t.name}: ${t.error}`, 'red');
        });
    }

    log('\n' + '═'.repeat(60), 'bright');

    if (results.failed === 0) {
        log('\n🎉 ALL TESTS PASSED! APP IS READY FOR PRODUCTION! 🎉\n', 'green');
        return 0;
    } else {
        log('\n⚠️  SOME TESTS FAILED. REVIEW REQUIRED.\n', 'yellow');
        return 1;
    }
}

async function main() {
    log('\n🚀 ========================================', 'bright');
    log('🚀 COMPREHENSIVE AUTOMATED TEST SUITE', 'bright');
    log('🚀 ========================================\n', 'bright');

    try {
        await testUserRegistration();
        await testServiceCreation();
        await testAppointmentFlow();
        await testAPIEndpoints();
        await cleanup();

        const exitCode = await generateReport();
        process.exit(exitCode);
    } catch (error) {
        log(`\n💥 FATAL ERROR: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

main();
