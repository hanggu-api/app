
import axios from 'axios';

const BACKEND_URL = 'https://backend-pi-ivory-11.vercel.app/api';
const TOKEN = 'TEST_TOKEN';

async function testMainBackendAI() {
    console.log(`🚀 Testing Main Backend Classification: ${BACKEND_URL}/services/ai/classify`);

    try {
        const response = await axios.post(`${BACKEND_URL}/services/ai/classify`, {
            text: 'Preciso de um eletricista para trocar uma tomada'
        }, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('✅ Response Status:', response.status);
        console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error('❌ Error calling backend:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testMainBackendAI();
