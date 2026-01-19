/**
 * Automated Test Suite for Service Flow
 * Tests the complete service lifecycle from creation to completion
 */

const API_BASE = 'https://projeto-central-backend.carrobomebarato.workers.dev/api';

// Test configuration
// NOTE: You need to generate Firebase ID tokens for these users
// Run: firebase auth:export to get tokens, or use the Firebase Admin SDK
const TEST_CONFIG = {
    // Replace these with actual Firebase ID tokens
    clientToken: process.env.TEST_CLIENT_TOKEN || 'YOUR_CLIENT_FIREBASE_TOKEN_HERE',
    providerToken: process.env.TEST_PROVIDER_TOKEN || 'YOUR_PROVIDER_FIREBASE_TOKEN_HERE',
    serviceDescription: 'Teste automatizado - Instalação elétrica',
    professionId: 1, // Eletricista
};

// Utility functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Suite
class ServiceFlowTests {
    constructor() {
        this.clientToken = null;
        this.providerToken = null;
        this.serviceId = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: [],
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
        }[type];
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async assert(condition, testName) {
        if (condition) {
            this.log(`PASS: ${testName}`, 'success');
            this.results.passed++;
            this.results.tests.push({ name: testName, status: 'PASS' });
        } else {
            this.log(`FAIL: ${testName}`, 'error');
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'FAIL' });
            throw new Error(`Test failed: ${testName}`);
        }
    }

    // Test 1: Authentication (Token Setup)
    async testAuthentication() {
        this.log('Test 1: Authentication (Token Setup)', 'info');

        try {
            // Check if tokens are provided
            if (!TEST_CONFIG.clientToken || TEST_CONFIG.clientToken === 'YOUR_CLIENT_FIREBASE_TOKEN_HERE') {
                throw new Error('Client token not configured. Set TEST_CLIENT_TOKEN environment variable.');
            }

            if (!TEST_CONFIG.providerToken || TEST_CONFIG.providerToken === 'YOUR_PROVIDER_FIREBASE_TOKEN_HERE') {
                throw new Error('Provider token not configured. Set TEST_PROVIDER_TOKEN environment variable.');
            }

            this.clientToken = TEST_CONFIG.clientToken;
            this.providerToken = TEST_CONFIG.providerToken;

            await this.assert(!!this.clientToken, 'Client token configured');
            await this.assert(!!this.providerToken, 'Provider token configured');

            this.log('Using pre-configured Firebase tokens', 'success');
        } catch (error) {
            this.log(`Authentication setup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // Test 2: Service Creation
    async testServiceCreation() {
        this.log('Test 2: Service Creation', 'info');

        const response = await apiCall('/services', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.clientToken}` },
            body: JSON.stringify({
                profession_id: TEST_CONFIG.professionId,
                description: TEST_CONFIG.serviceDescription,
                latitude: -15.7942,
                longitude: -47.8822,
                address: 'Brasília, DF',
            }),
        });

        await this.assert(response.success === true, 'Service creation API success');
        await this.assert(!!response.service_id, 'Service ID returned');

        this.serviceId = response.service_id;
        this.log(`Service created with ID: ${this.serviceId}`, 'success');
    }

    // Test 3: Payment Simulation
    async testPaymentSimulation() {
        this.log('Test 3: Payment Simulation (Upfront)', 'info');

        const response = await apiCall('/test/force-payment-approval', {
            method: 'POST',
            headers: { 'X-Test-Secret': 'test-secret-2024' },
            body: JSON.stringify({
                service_id: this.serviceId,
                type: 'upfront',
            }),
        });

        await this.assert(response.success === true, 'Upfront payment approved');

        // Wait for status update
        await wait(2000);
    }

    // Test 4: Service Status Check
    async testServiceStatus(expectedStatus) {
        this.log(`Test 4: Service Status Check (expecting: ${expectedStatus})`, 'info');

        const response = await apiCall(`/services/${this.serviceId}`, {
            headers: { Authorization: `Bearer ${this.clientToken}` },
        });

        await this.assert(response.success === true, 'Service fetch successful');
        await this.assert(response.service.status === expectedStatus, `Status is ${expectedStatus}`);

        return response.service;
    }

    // Test 5: Provider Acceptance
    async testProviderAcceptance() {
        this.log('Test 5: Provider Acceptance', 'info');

        const response = await apiCall(`/services/${this.serviceId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.providerToken}` },
        });

        await this.assert(response.success === true, 'Service acceptance successful');

        // Wait for status update
        await wait(2000);

        const service = await this.testServiceStatus('accepted');
        await this.assert(!!service.provider_id, 'Provider ID assigned');
    }

    // Test 6: Provider Arrival
    async testProviderArrival() {
        this.log('Test 6: Provider Arrival', 'info');

        const response = await apiCall(`/services/${this.serviceId}/arrive`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.providerToken}` },
        });

        await this.assert(response.success === true, 'Arrival marked successfully');

        // Wait for status update
        await wait(2000);

        const service = await this.testServiceStatus('waiting_payment_remaining');
        await this.assert(!!service.arrived_at, 'Arrival timestamp set');
    }

    // Test 7: Remaining Payment
    async testRemainingPayment() {
        this.log('Test 7: Remaining Payment', 'info');

        const response = await apiCall('/test/force-payment-approval', {
            method: 'POST',
            headers: { 'X-Test-Secret': 'test-secret-2024' },
            body: JSON.stringify({
                service_id: this.serviceId,
                type: 'remaining',
            }),
        });

        await this.assert(response.success === true, 'Remaining payment approved');

        // Wait for status update
        await wait(2000);

        await this.testServiceStatus('in_progress');
    }

    // Test 8: Service Completion
    async testServiceCompletion() {
        this.log('Test 8: Service Completion', 'info');

        // Request completion
        const requestResponse = await apiCall(`/services/${this.serviceId}/request-completion`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.providerToken}` },
        });

        await this.assert(requestResponse.success === true, 'Completion requested');
        await this.assert(!!requestResponse.code, 'Completion code generated');

        // Verify code
        const verifyResponse = await apiCall(`/services/${this.serviceId}/verify-code`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.clientToken}` },
            body: JSON.stringify({ code: requestResponse.code }),
        });

        await this.assert(verifyResponse.success === true, 'Code verified');

        // Confirm completion
        const confirmResponse = await apiCall(`/services/${this.serviceId}/confirm-completion`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.clientToken}` },
            body: JSON.stringify({ rating: 5, comment: 'Excelente serviço!' }),
        });

        await this.assert(confirmResponse.success === true, 'Service completed');

        // Wait for status update
        await wait(2000);

        const service = await this.testServiceStatus('completed');
        await this.assert(!!service.completed_at, 'Completion timestamp set');
    }

    // Test 9: Provider Wallet Balance
    async testProviderWallet() {
        this.log('Test 9: Provider Wallet Balance', 'info');

        const response = await apiCall('/profile/me', {
            headers: { Authorization: `Bearer ${this.providerToken}` },
        });

        await this.assert(response.success === true, 'Profile fetch successful');
        await this.assert(response.user.wallet_balance > 0, 'Wallet balance updated');

        this.log(`Provider wallet balance: R$ ${response.user.wallet_balance}`, 'success');
    }

    // Run all tests
    async runAll() {
        this.log('Starting Automated Test Suite', 'info');
        this.log('='.repeat(50), 'info');

        try {
            await this.testAuthentication();
            await this.testServiceCreation();
            await this.testPaymentSimulation();
            await this.testServiceStatus('pending');
            await this.testProviderAcceptance();
            await this.testProviderArrival();
            await this.testRemainingPayment();
            await this.testServiceCompletion();
            await this.testProviderWallet();

            this.log('='.repeat(50), 'info');
            this.log('All tests completed successfully!', 'success');
            this.printSummary();
        } catch (error) {
            this.log('='.repeat(50), 'info');
            this.log(`Test suite failed: ${error.message}`, 'error');
            this.printSummary();
            throw error;
        }
    }

    printSummary() {
        this.log('='.repeat(50), 'info');
        this.log('Test Summary:', 'info');
        this.log(`Total: ${this.results.passed + this.results.failed}`, 'info');
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
        this.log('='.repeat(50), 'info');

        console.table(this.results.tests);
    }
}

// Run tests
const tests = new ServiceFlowTests();
tests.runAll().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
