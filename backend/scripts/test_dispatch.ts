
import pool from "../src/database/db";
import axios from "axios";

const LAT = -23.5505;
const LON = -46.6333;
const API_URL = "https://cardapyia.com/api";

async function run() {
  console.log("--- Test Dispatch Flow (via API) ---");

  // 1. Find the most recent Provider
  const [provRows]: any = await pool.query(
    `SELECT u.id, u.email, u.full_name 
     FROM users u 
     JOIN providers p ON u.id = p.user_id 
     ORDER BY u.created_at DESC LIMIT 1`
  );

  if (provRows.length === 0) {
    console.error("No providers found! Create a provider in the app first.");
    process.exit(1);
  }

  const provider = provRows[0];
  console.log(`Target Provider: ${provider.full_name} (ID: ${provider.id})`);

  // 2. Update Provider Location
  console.log(`Updating Provider Location to ${LAT}, ${LON}...`);
  await pool.query(
    `UPDATE providers SET latitude = ?, longitude = ? WHERE user_id = ?`,
    [LAT, LON, provider.id]
  );
  
  // 3. Create Client & Login to get Token
  const clientEmail = `client_test_${Date.now()}@test.com`;
  const password = "password123";
  
  console.log(`Registering Client: ${clientEmail}`);
  try {
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      email: clientEmail,
      password: password,
      name: "Client Test Flow",
      role: "client",
      phone: "119" + Date.now().toString().slice(-8)
    });
    
    const token = regRes.data.token;
    console.log("Client Registered. Token obtained.");

    // 4. Create Service Request via API
    console.log("Creating Service Request...");
    const serviceRes = await axios.post(
      `${API_URL}/services`, 
      {
        category_id: 1,
        description: "Serviço de Teste Real-Time Alert",
        latitude: LAT,
        longitude: LON,
        address: "Rua do Teste, 123",
        price_estimated: 120.00,
        price_upfront: 30.00
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const serviceId = serviceRes.data.id;
    console.log("Service Created ID:", serviceId);

    // 5. Force Status to Pending (Bypass Payment)
    console.log("Forcing status to 'pending'...");
    await pool.query("UPDATE service_requests SET status = 'pending' WHERE id = ?", [serviceId]);

    // 6. Trigger Dispatch Manually
    console.log("Triggering Dispatch...");
    const dispatchRes = await axios.post(
      `${API_URL}/services/${serviceId}/dispatch`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log("Dispatch Result:", dispatchRes.data);
    console.log(">>> CHECK YOUR APP NOW! <<<");

  } catch (error: any) {
    console.error("Error executing flow:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }

  process.exit(0);
}

run().catch(console.error);
