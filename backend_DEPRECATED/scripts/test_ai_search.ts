
import axios from 'axios';

const BACKEND_URL = 'http://localhost:4011';
const AUTH_TOKEN = 'SUPER_TEST_TOKEN'; // We assume this bypasses auth middleware in dev if configured, or we need to login

async function runTest(text: string) {
    console.log(`\n🧪 Testing query: "${text}"`);
    try {
        const response = await axios.post(`${BACKEND_URL}/api/services/ai/classify`, { text }, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
        });
        const data = response.data;
        console.log('✅ Response:', JSON.stringify(data, null, 2));

        if (data.task_id) {
            console.log(`🎯 Match found in Task Catalog: ${data.task_name} (ID: ${data.task_id})`);
        } else if (data.id && data.encontrado) {
            console.log(`⚠️ Match found in Professions but NOT Task Catalog (or Task ID missing): ${data.name} (ID: ${data.id})`);
        } else {
            console.log('❌ No match found.');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

async function main() {
    // Test 1: Specific Task
    await runTest('instalar ar condicionado'); // Should match "Instalação de Ar Condicionado" or similar

    // Test 2: General Profession
    await runTest('encanador');

    // Test 3: Very specific task
    await runTest('trocar pneu furado');
}

main();
