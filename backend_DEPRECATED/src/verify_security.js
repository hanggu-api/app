const axios = require('axios');

async function testSecurity() {
    const API_URL = 'http://localhost:4011/api';
    console.log('[TEST] Checking Rate Limiting on Auth/Login...');

    for (let i = 1; i <= 35; i++) {
        try {
            const resp = await axios.post(`${API_URL}/auth/login`, { token: 'invalid' });
            console.log(`Attempt ${i}: Status ${resp.status}`);
        } catch (err) {
            if (err.response) {
                console.log(`Attempt ${i}: Status ${err.response.status}`);
                if (err.response.status === 500) {
                    console.log('Error Body:', JSON.stringify(err.response.data));
                    // If we see 500, we probably shouldn't continue flooding unless we want to test rate limit on 500s
                }
                if (err.response.status === 429) {
                    console.log('\n✅ [SUCCESS] Rate limit triggered as expected at attempt', i);
                    console.log('Message:', err.response.data.message);
                    break;
                }
            } else {
                console.log(`Attempt ${i}: Error - ${err.message}`);
            }
        }
    }

    // Sanitization check
    console.log('\n[TEST] Checking XSS Sanitization...');
    try {
        const resp = await axios.post(`${API_URL}/auth/login`, { token: '<script>alert("xss")</script>' });
        console.log('Sanitization test sent.');
    } catch (e) { }

}

testSecurity();
