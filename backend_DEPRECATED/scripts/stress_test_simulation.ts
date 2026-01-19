
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { appendFileSync } from 'fs';

const API_URL = 'http://localhost:4011/api';
const LOG_FILE = 'stress_test.log';

const NUM_USERS = 100;
const NUM_PROVIDERS = 10;

// Utils
const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    appendFileSync(LOG_FILE, line + '\n');
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Store tokens
const users: { id: number, token: string, email: string }[] = [];
const providers: { id: number, token: string, email: string }[] = [];

// Service IDs created
const serviceIds: number[] = [];
const chunk = <T>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
};

async function setup() {
    log(`Starting Stress Test Simulation`);
    log(`Target: ${API_URL}`);
    log(`Users: ${NUM_USERS}, Providers: ${NUM_PROVIDERS}`);

    // 1. Create Users (Batched)
    log(`creating ${NUM_USERS} users...`);
    const userIndices = Array.from({ length: NUM_USERS }, (_, i) => i);
    const userBatches = chunk(userIndices, 20);

    for (const batch of userBatches) {
        const promises = batch.map(async (i) => {
            try {
                const email = `user_stress_${uuidv4().substring(0, 8)}@test.com`;
                const token = `MOCK_TOKEN_${email}`;
                // Use name, not full_name
                const res = await axios.post(`${API_URL}/auth/register`, {
                    token,
                    name: `Stress User ${i}`,
                    email,
                    phone: `119${Math.floor(Math.random() * 100000000)}`,
                    role: 'client'
                });
                if (res.data.success) {
                    // Store the TOKEN we sent, because response doesn't return a new one
                    users.push({ id: res.data.user.id, token: token, email });
                }
            } catch (e: any) {
                log(`User creation failed: ${e.message}`);
            }
        });
        await Promise.all(promises);
        log(`Batch processed. Users count: ${users.length}`);
        await delay(500);
    }
    log(`Created ${users.length} users.`);

    // 2. Create Providers (Batched)
    log(`creating ${NUM_PROVIDERS} providers...`);
    const providerIndices = Array.from({ length: NUM_PROVIDERS }, (_, i) => i);

    const providerPromises = providerIndices.map(async (i) => {
        try {
            const email = `provider_stress_${uuidv4().substring(0, 8)}@test.com`;
            const token = `MOCK_TOKEN_${email}`;
            const res = await axios.post(`${API_URL}/auth/register`, {
                token,
                name: `Stress Provider ${i}`,
                email,
                phone: `119${Math.floor(Math.random() * 100000000)}`,
                role: 'provider'
            });
            if (res.data.success) {
                providers.push({ id: res.data.user.id, token: token, email });
            }
        } catch (e: any) {
            log(`Provider creation failed: ${e.message}`);
        }
    });
    await Promise.all(providerPromises);
    log(`Created ${providers.length} providers.`);
}

async function userLoop(user: typeof users[0]) {
    // Random delay startup
    await delay(Math.random() * 5000);

    // Create Service
    try {
        const servicePayload = {
            description: "Stress Test Service Request",
            category_id: 1, // Assumes category 1 exists
            profession: "Stress Tester",
            latitude: -23.55052,
            longitude: -46.63330,
            address: "Rua Stress, 100"
        };

        const createRes = await axios.post(`${API_URL}/services`, servicePayload, {
            headers: { Authorization: `Bearer ${user.token}` }
        });

        if (createRes.data.success) {
            const serviceId = createRes.data.serviceId;
            log(`User ${user.id} created service ${serviceId}`);
            serviceIds.push(serviceId);

            // Pay Upfront (Fake Pix)
            await delay(1000); // Simulate user reading
            const paymentPayload = {
                service_id: serviceId,
                payment_method_id: 'pix',
                payment_type: 'initial',
                payer: { email: user.email },
                description: "Initial Payment",
                transaction_amount: 100
            };

            const payRes = await axios.post(`${API_URL}/payment`, paymentPayload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            if (payRes.data.success) {
                log(`User ${user.id} paid service ${serviceId} (Fake Pix). Waiting for processing...`);
                // The backend processes fake pix in 5s (setTimeout).
                await delay(6000);

                // Check status
                const statusRes = await axios.get(`${API_URL}/services/${serviceId}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const status = statusRes.data.service?.status;
                log(`Service ${serviceId} status after payment: ${status}`);

                // Wait for connection/acceptance (Simulated by provider loop)
            }
        }
    } catch (e: any) {
        log(`User ${user.id} Error: ${e.message}`);
    }
}

async function providerLoop(provider: typeof providers[0]) {
    // Run for a fixed duration or until stopped. Simplified: run 100 iterations
    for (let k = 0; k < 100; k++) {
        try {
            await delay(Math.random() * 2000 + 1000);
            const res = await axios.get(`${API_URL}/services/available`, {
                headers: { Authorization: `Bearer ${provider.token}` }
            });
            const services = res.data.services || [];

            if (services.length > 0) {
                const s = services[Math.floor(Math.random() * services.length)];

                if (Math.random() < 0.7) {
                    await axios.post(`${API_URL}/services/${s.id}/accept`, {}, { headers: { Authorization: `Bearer ${provider.token}` } });
                    log(`Provider ${provider.id} accepted service ${s.id}`);
                } else {
                    await axios.post(`${API_URL}/services/${s.id}/reject`, {}, { headers: { Authorization: `Bearer ${provider.token}` } });
                    log(`Provider ${provider.id} rejected service ${s.id}`);
                }
            }
        } catch (e: any) {
            // Ignore errors (race conditions, etc)
        }
    }
}

async function run() {
    await setup();
    log('Starting Simulation Loop...');

    // Launch Provider Loops (Start disjointly)
    const providerActions = providers.map(p => providerLoop(p));

    // Launch User Loops
    const userActions = users.map(u => userLoop(u));

    // Wait for users (Providers will stop after 100 iters or we kill script)
    await Promise.all(userActions);
    log('User simulation finished. Providers stopping...');
    log('Simulation Finished.');
    process.exit(0);
}

run();
