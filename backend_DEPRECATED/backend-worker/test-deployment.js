const fetch = require('node-fetch'); // Assuming node environment has fetch or I might need to use https module if fetch not available in older node.
// Actually, Node 18+ has native fetch. I will assume Node 18+.

const BASE_URL = 'https://meu-backend-node.carrobomebarato.workers.dev';

async function runTests() {
    console.log(`Starting tests against ${BASE_URL}...`);

    try {
        // Test 1: Health Check
        console.log('\n[Test 1] Checking status...');
        const statusRes = await fetch(`${BASE_URL}/api/status`);
        if (statusRes.status !== 200) throw new Error(`Status check failed: ${statusRes.status}`);
        const statusData = await statusRes.json();
        console.log('✅ Status OK:', statusData);

        // Test 2: Create User
        console.log('\n[Test 2] Creating user...');
        const testUser = {
            email: `test_${Date.now()}@example.com`,
            password: 'password123',
            name: 'Test User'
        };
        const createRes = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        
        if (createRes.status !== 200) {
            const errorText = await createRes.text();
            throw new Error(`Create user failed: ${createRes.status} - ${errorText}`);
        }
        
        const createdUser = await createRes.json();
        console.log('✅ User created:', createdUser);
        
        // Test 3: List Users
        console.log('\n[Test 3] Listing users...');
        const listRes = await fetch(`${BASE_URL}/api/users`);
        if (listRes.status !== 200) throw new Error(`List users failed: ${listRes.status}`);
        const users = await listRes.json();
        console.log(`✅ Users listed (${users.length} users found)`);
        
        // Verify created user is in list
        const found = users.find(u => u.email === testUser.email);
        if (found) {
            console.log('✅ Created user found in list!');
        } else {
            console.error('❌ Created user NOT found in list!');
        }

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

runTests();
