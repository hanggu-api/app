import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://meu-backend-node.carrobomebarato.workers.dev';

describe('Severe Integration Tests (Production)', () => {
  
  it('Health Check: Should respond quickly', async () => {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/api/status`);
    const duration = performance.now() - start;
    
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1500); // Expecting < 1.5s cold start or < 200ms warm
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.environment).toBe('Cloudflare Workers');
  });

  it('Data Integrity: Should return users list', async () => {
    const res = await fetch(`${BASE_URL}/api/users`);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    
    // Check structure of first user
    const user = users[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('created_at');
  });

  it('Migration Check: Should return appointments', async () => {
    const res = await fetch(`${BASE_URL}/api/appointments`);
    expect(res.status).toBe(200);
    const appointments = await res.json();
    expect(Array.isArray(appointments)).toBe(true);
    // Based on our dump, we know there are 12 appointments
    expect(appointments.length).toBeGreaterThanOrEqual(12);
  });

  it('Write Operation: Should create a new user', async () => {
    const newUser = {
      email: `stress_test_${Date.now()}@test.com`,
      password: 'password123',
      name: 'Stress Test User'
    };

    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    expect(res.status).toBe(200);
    const createdUser = await res.json();
    expect(createdUser.email).toBe(newUser.email);
    expect(createdUser.id).toBeDefined();
  });

  it('Load Test: Should handle concurrent requests', async () => {
    const CONCURRENCY = 20;
    const requests = Array(CONCURRENCY).fill(null).map(() => fetch(`${BASE_URL}/api/status`));
    
    const start = performance.now();
    const responses = await Promise.all(requests);
    const duration = performance.now() - start;

    console.log(`Load Test: ${CONCURRENCY} requests in ${duration.toFixed(2)}ms`);

    responses.forEach(res => {
      expect(res.status).toBe(200);
    });
    
    // Average time per request (rough estimate of throughput capability)
    expect(duration / CONCURRENCY).toBeLessThan(500); 
  });
});
