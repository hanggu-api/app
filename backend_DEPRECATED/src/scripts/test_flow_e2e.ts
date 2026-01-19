import axios from 'axios';
import pool from '../database/db';

const API_URL = 'http://localhost:4011/api';

async function main() {
  try {
    console.log('--- STARTING E2E FLOW TEST ---');

    // 0. Get Professions
    let professionId = 1;
    try {
        const profRes = await axios.get(`${API_URL}/auth/professions`);
        if (profRes.data.professions && profRes.data.professions.length > 0) {
            professionId = profRes.data.professions[0].id;
            console.log(`> Full Profession Object:`, profRes.data.professions[0]);
            console.log(`> Using Profession ID: ${professionId} (${profRes.data.professions[0].name})`);
        }
    } catch (e) {
        console.log('> Failed to fetch professions, using default ID 1');
    }

    // 1. Register/Login Client
    const clientEmail = `client_${Date.now()}@test.com`;
    const clientPass = '123456';
    console.log(`> Registering Client: ${clientEmail}`);
    
    let clientToken = '';
    
    try {
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: clientEmail,
            password: clientPass,
            name: 'Test Client',
            role: 'client',
            phone: `117${Date.now().toString().slice(-8)}`,
            professions: []
        });
        clientToken = regRes.data.token;
    } catch (e: any) {
        console.error('Client Register Error:', e.response?.data || e.message);
        return;
    }

    // 2. Register/Login Provider
    const providerEmail = `provider_${Date.now()}@test.com`;
    const providerPass = '123456';
    console.log(`> Registering Provider: ${providerEmail}`);

    let providerToken = '';

    try {
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: providerEmail,
            password: providerPass,
            name: 'Test Provider',
            role: 'provider',
            phone: `119${Date.now().toString().slice(-8)}`,
            commercial_name: 'Provider S.A.',
            professions: [{ id: professionId, name: 'Test Profession' }], 
            latitude: -23.55,
            longitude: -46.63
        });
        providerToken = regRes.data.token;
    } catch (e: any) {
        console.error('Provider Register Error:', e.message);
        if (e.response) console.error('Details:', JSON.stringify(e.response.data, null, 2));
        return;
    }

    // 3. Client Creates Service
    console.log('> Creating Service...');
    let serviceId = '';
    try {
        const serviceRes = await axios.post(`${API_URL}/services`, {
            category_id: 1, // Force ID 1
            description: 'Preciso de um reparo na fiação elétrica urgente.',
            latitude: -23.5505,
            longitude: -46.6333,
            address: 'Rua Teste, 123',
            price_estimated: 100,
            price_upfront: 20
        }, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        serviceId = serviceRes.data.id;
        console.log(`> Service Created: ${serviceId}`);

        // SIMULATE PAYMENT (Direct DB Update)
        await pool.query("UPDATE service_requests SET status = 'pending' WHERE id = ?", [serviceId]);
        console.log(`> [MOCK] Service Status updated to 'pending' (Payment Simulated)`);

    } catch (e: any) {
        console.error('Create Service Error:', e.response?.data || e.message);
        return;
    }

    // 4. Provider Accepts
    console.log('> Provider Accepting Service...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/accept`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('> Service Accepted');
    } catch (e: any) {
        console.error('Accept Service Error:', e.response?.data || e.message);
        return;
    }

    // 5. Provider Arrives (Flow A: Provider -> Client)
    console.log('> Provider Arriving...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/arrive`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('> Provider Arrived');
    } catch (e: any) {
         console.error('Arrive Error:', e.response?.data || e.message);
    }

    // 6. Client Pays Remaining
    console.log('> Client Paying Remaining...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/pay_remaining`, {}, {
             headers: { Authorization: `Bearer ${clientToken}` }
        });
        console.log('> Remaining Paid');
    } catch (e: any) {
        console.error('Pay Remaining Error:', e.response?.data || e.message);
    }

    // 7. Provider Starts
    console.log('> Provider Starting Service...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/start`, {
             latitude: -23.5505,
             longitude: -46.6333
        }, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('> Service Started');
    } catch (e: any) {
        console.error('Start Service Error:', e.response?.data || e.message);
    }

    // 8. Provider Completes
    console.log('> Provider Completing Service...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/complete`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        console.log('> Service Completed');
    } catch (e: any) {
        console.error('Complete Service Error:', e.response?.data || e.message);
    }

    // 9. Client Contests
    console.log('> Client Contesting...');
    try {
        await axios.post(`${API_URL}/services/${serviceId}/contest`, {
            reason: 'O serviço não ficou bom.'
        }, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        console.log('> Service Contested');
    } catch (e: any) {
        console.error('Contest Error:', e.response?.data || e.message);
    }
    
    console.log('--- E2E FLOW TEST COMPLETED ---');

  } catch (err) {
    console.error('Unexpected Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
