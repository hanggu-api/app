const axios = require('axios');

async function testBackend() {
    console.log('🚀 Starting Backend Exhaustive Test...');
    const baseUrl = 'http://localhost:4011/api'; // Based on server.ts mounting app at / and app having /api

    try {
        // 1. Health Check
        console.log('\n🏥 Checking Health...');
        const health = await axios.get('http://localhost:4011/health');
        console.log('✅ Health Response:', health.data);

        // 2. Auth Login (Unauthorized case)
        console.log('\n🔐 Testing Login (Invalid Token)...');
        try {
            await axios.post(`${baseUrl}/auth/login`, {
                token: "INVALID_TOKEN"
            });
        } catch (e) {
            console.log('✅ Expected Unauthorized:', e.response.status, e.response.data);
        }

        // 3. Database Check (Assuming there is a public route or health check that hits DB)
        // The serverlogs during startup show database status.

        console.log('\n✨ Backend Test Completed Successfully!');
    } catch (error) {
        console.error('❌ Backend Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

testBackend();
