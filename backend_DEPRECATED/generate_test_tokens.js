/**
 * Helper script to generate Firebase ID tokens for testing
 * This uses Firebase Admin SDK to create custom tokens
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// You need to download your service account key from Firebase Console
// and save it as firebase-service-account.json
try {
    const serviceAccount = require('./firebase-service-account.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Error: firebase-service-account.json not found');
    console.error('Download it from: Firebase Console > Project Settings > Service Accounts');
    process.exit(1);
}

// Test user UIDs (you need to create these users in Firebase Auth first)
const TEST_USERS = {
    client: 'test-client-uid', // Replace with actual Firebase UID
    provider: 'test-provider-uid', // Replace with actual Firebase UID
};

async function generateTokens() {
    console.log('🔑 Generating Firebase ID Tokens for Testing\n');
    console.log('='.repeat(50));

    try {
        // Generate client token
        const clientToken = await admin.auth().createCustomToken(TEST_USERS.client);
        console.log('\n✅ Client Token Generated:');
        console.log(`export TEST_CLIENT_TOKEN="${clientToken}"`);

        // Generate provider token
        const providerToken = await admin.auth().createCustomToken(TEST_USERS.provider);
        console.log('\n✅ Provider Token Generated:');
        console.log(`export TEST_PROVIDER_TOKEN="${providerToken}"`);

        console.log('\n' + '='.repeat(50));
        console.log('\n📋 To use these tokens:');
        console.log('1. Copy the export commands above');
        console.log('2. Run them in your terminal');
        console.log('3. Run: node test_automated_flow.js');

        console.log('\n💡 Or create a .env file:');
        console.log(`TEST_CLIENT_TOKEN=${clientToken}`);
        console.log(`TEST_PROVIDER_TOKEN=${providerToken}`);

    } catch (error) {
        console.error('❌ Error generating tokens:', error.message);
        console.error('\nMake sure:');
        console.error('1. You have created test users in Firebase Auth');
        console.error('2. You have updated TEST_USERS with correct UIDs');
        process.exit(1);
    }
}

generateTokens();
