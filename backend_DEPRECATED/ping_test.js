const axios = require('axios');

const API_URL = 'https://projeto-central-backend.carrobomebarato.workers.dev/api';

async function ping() {
    try {
        console.log('Testing /health...');
        const h = await axios.get('https://projeto-central-backend.carrobomebarato.workers.dev/health');
        console.log('Health:', h.status, JSON.stringify(h.data));

        console.log('\nTesting /auth/register...');
        try {
            const r = await axios.post(`${API_URL}/auth/register`, {
                token: "header.eyJzdWIiOiJ1aWRfdGVzdCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IFVzZXIifQ.signature",
                email: "test@example.com"
            });
            console.log('Register:', r.status, JSON.stringify(r.data));
        } catch (e) {
            console.log('Register Error:', e.message);
            if (e.response) {
                console.log('Status:', e.response.status);
                console.log('Data:', JSON.stringify(e.response.data));
            }
        }
    } catch (e) {
        console.error('Fatal:', e.message);
    }
}

ping();
