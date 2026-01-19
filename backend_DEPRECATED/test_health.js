/**
 * Quick Backend Health Check
 * Verifies that key endpoints are accessible
 */

const API_BASE = 'https://projeto-central-backend.carrobomebarato.workers.dev/api';

async function testEndpoint(name, url, options = {}) {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        console.log(`✅ ${name}: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log(`   Response:`, typeof data === 'string' ? data.substring(0, 100) : data);
        }
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runHealthChecks() {
    console.log('🏥 Backend Health Check');
    console.log('='.repeat(60));

    // Test 1: Professions endpoint
    await testEndpoint(
        'Professions List',
        `${API_BASE}/services/professions`
    );

    console.log('');

    // Test 2: Debug ping
    await testEndpoint(
        'Debug Ping',
        `${API_BASE}/debug/ping`
    );

    console.log('');

    // Test 3: Force payment (should fail without auth)
    await testEndpoint(
        'Test Payment Endpoint (expect 401)',
        `${API_BASE}/test/force-payment-approval`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ service_id: 'test', type: 'upfront' })
        }
    );

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Health check complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Backend is accessible');
    console.log('2. Test endpoints require X-Test-Secret header');
    console.log('3. Use the mobile app to test the full flow');
}

runHealthChecks();
