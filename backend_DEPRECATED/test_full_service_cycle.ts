import axios from 'axios';

// Hardcoded for stability during integration test
const API_URL = 'https://projeto-central-backend.carrobomebarato.workers.dev/api';
const TEST_SECRET = 'maestro-v2-test-secret';

// Helper for Mock JWT (matching backend decodeJwt logic)
function generateMockToken(email: string, uid: string) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString('base64').replace(/=/g, '');
    const payload = Buffer.from(JSON.stringify({ sub: uid, email: email, name: "Test User" })).toString('base64').replace(/=/g, '');
    return `header.${payload}.signature`;
}

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runFullCycleTest() {
    console.log('--- Starting Full Service Cycle Integration Test ---');
    console.log(`API URL: ${API_URL}`);

    const clientEmail = `test_client_${Date.now()}@example.com`;
    const providerEmail = `test_provider_${Date.now()}@example.com`;
    const password = 'Password123!';

    let clientToken = '';
    let providerToken = '';
    let providerId = 0;
    let serviceId = '';

    try {
        // 1. Register Client
        console.log('[STEP 1] Registering Client...');
        const clientUid = `uid_client_${Date.now()}`;
        const cMockToken = generateMockToken(clientEmail, clientUid);
        try {
            const regClientRes = await axios.post(`${API_URL}/auth/register`, {
                full_name: 'Test Client',
                email: clientEmail,
                password: password,
                role: 'client',
                phone: '11999998888',
                token: cMockToken
            });
            clientToken = regClientRes.data.token || cMockToken;
            console.log('✅ Client Registered.');
        } catch (e: any) {
            console.error('❌ Client Registration Failed:', e.message);
            if (e.response) {
                console.error('Response Status:', e.response.status);
                console.error('Response Data:', JSON.stringify(e.response.data));
            }
            throw e;
        }

        // 2. Register Provider
        console.log('[STEP 2] Registering Provider...');
        const providerUid = `uid_prov_${Date.now()}`;
        const pMockToken = generateMockToken(providerEmail, providerUid);
        try {
            const regProvRes = await axios.post(`${API_URL}/auth/register`, {
                full_name: 'Test Provider',
                email: providerEmail,
                password: password,
                role: 'provider',
                phone: '11988887777',
                commercial_name: 'Test Tech Services',
                token: pMockToken
            });
            providerToken = regProvRes.data.token || pMockToken;
            providerId = regProvRes.data.user.id;
            console.log(`✅ Provider Registered (ID: ${providerId}).`);
        } catch (e: any) {
            console.error('❌ Provider Registration Failed:', e.message);
            if (e.response) {
                console.error('Response Status:', e.response.status);
                console.error('Response Data:', JSON.stringify(e.response.data));
            }
            throw e;
        }

        // Check initial balance
        const initialProfile = await axios.get(`${API_URL}/profile/me`, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        const initialBalance = Number(initialProfile.data.user.wallet_balance || 0);
        console.log(`💰 Initial Provider Balance: R$ ${initialBalance.toFixed(2)}`);

        // 3. Create Service Request (As Client)
        console.log('3️⃣  Creating Service Request...');
        const createRes = await axios.post(`${API_URL}/services`, {
            category_id: 2, // Eletricista
            description: 'Fixing electrical outlets - Integration Test',
            latitude: -23.550520,
            longitude: -46.633308,
            address: 'Rua Teste, 100',
            price_estimated: 100.0,
            price_upfront: 30.0,
            profession: 'Eletricista',
            location_type: 'client'
        }, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        serviceId = createRes.data.service?.id || createRes.data.id;
        console.log(`✅ Service Created: ${serviceId} (Status: waiting_payment)`);

        // 4. Force Payment Upfront (Initial)
        console.log('4️⃣  Simulating Initial Payment approval...');
        await axios.post(`${API_URL}/test/force-payment-approval`, {
            service_id: serviceId,
            type: 'initial'
        }, {
            headers: { 'X-Test-Secret': TEST_SECRET }
        });
        console.log('✅ Payment Approved. Status should be pending.');

        // 5. Provider Accepts Service
        console.log('5️⃣  Provider Accepting Service...');
        await axios.post(`${API_URL}/services/${serviceId}/accept`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('✅ Service Accepted.');

        // 6. Provider Arrives
        console.log('6️⃣  Provider Recording Arrival...');
        await axios.post(`${API_URL}/services/${serviceId}/arrive`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('✅ Arrival recorded.');

        // 7. Test Cancellation Block (Security Check)
        console.log('7️⃣  Verifying Cancellation Block after Arrival...');
        try {
            await axios.post(`${API_URL}/services/${serviceId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${clientToken}` }
            });
            console.error('❌ FAILURE: Cancellation should have been blocked after arrival.');
            process.exit(1);
        } catch (err: any) {
            if (err.response?.status === 403) {
                console.log('✅ SUCCESS: Cancellation correctly blocked (403).');
            } else {
                throw err;
            }
        }

        // 8. Force Remaining Payment
        console.log('8️⃣  Simulating Remaining Payment approval...');
        await axios.post(`${API_URL}/test/force-payment-approval`, {
            service_id: serviceId,
            type: 'remaining'
        }, {
            headers: { 'X-Test-Secret': TEST_SECRET }
        });
        console.log('✅ Remaining Payment Approved.');

        // 9. Confirm Completion (With Code)
        // Fetch service to get completion code
        const serviceData = await axios.get(`${API_URL}/services/${serviceId}`, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        const completionCode = serviceData.data.service.completion_code;
        console.log(`9️⃣  Confirming Completion with code: ${completionCode}...`);

        await axios.post(`${API_URL}/services/${serviceId}/confirm-completion`, {
            code: completionCode,
            proof_video: 'https://example.com/test-proof-video.mp4'
        }, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('✅ Service Completed.');

        // 10. Verify Final Balance
        console.log('🔟 Verifying Provider Earnings...');
        const finalProfile = await axios.get(`${API_URL}/profile/me`, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        const finalBalance = Number(finalProfile.data.user.wallet_balance || 0);

        // Expected: 100 * 0.85 = 85.0 (assuming 15% commission)
        console.log(`💰 Final Provider Balance: R$ ${finalBalance.toFixed(2)}`);

        if (finalBalance > initialBalance) {
            console.log(`✅ SUCCESS: Balance increased by R$ ${(finalBalance - initialBalance).toFixed(2)}.`);
        } else {
            console.error('❌ FAILURE: Balance did not increase.');
            process.exit(1);
        }

        console.log('\n✨ ALL TESTS PASSED! FULL CYCLE VERIFIED. ✨');

    } catch (error: any) {
        console.error('💥 Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

runFullCycleTest();
