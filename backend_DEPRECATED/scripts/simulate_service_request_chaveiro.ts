
import pool from '../src/database/db';

const API_URL = 'http://localhost:3000/api';

async function simulate() {
  try {
    // 1. Get a Client
    const [clients]: any = await pool.query(`SELECT id, email FROM users WHERE role = 'client' LIMIT 1`);
    if (clients.length === 0) {
      console.error("No client found.");
      return;
    }
    const client = clients[0];
    console.log(`Using client: ${client.email} (ID: ${client.id})`);

    // 2. Login Client (to get token) - Skipping real auth for simulation script if possible, 
    // but better to simulate properly. Or we can insert directly into DB but that skips dispatcher.
    // Let's use a "system" call or mocked token if we can, but simpler to just insert request and call dispatcher manually.

    // Actually, calling the dispatcher directly via script is easier than full HTTP flow

    // 3. Create Service Request in DB
    const serviceId = 'simulated_' + Date.now();
    const lat = -5.51574760; // Same as provider
    const lng = -47.46368900;
    const categoryId = 1; // Assuming 1 exists
    const profession = 'Chaveiro';

    await pool.query(`
      INSERT INTO service_requests (id, client_id, category_id, profession, description, latitude, longitude, address, price_estimated, price_upfront, status, location_type)
      VALUES (?, ?, ?, ?, 'Preciso de um chaveiro urgente', ?, ?, 'Rua Teste, 123', 100.00, 0.00, 'pending', 'client')
    `, [serviceId, client.id, categoryId, profession, lat, lng]);

    console.log(`Service Request created: ${serviceId}`);

    // 4. Trigger Dispatcher
    const { providerDispatcher } = require('../src/services/providerDispatcher');

    console.log("Starting dispatch...");
    await providerDispatcher.startDispatch(serviceId);

    console.log("Dispatch triggered. Check logs for notification sending.");

  } catch (error) {
    console.error("Simulation error:", error);
  } finally {
    // Keep alive for a moment to allow async ops
    setTimeout(() => {
      console.log("Exiting...");
      process.exit();
    }, 5000);
  }
}

simulate();
