import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import pool from "./database/db";

const API_URL = process.env.API_URL || "http://localhost:4011/api";

// Utility logging with colors
const log = (step: string, msg: string) =>
  console.log(`\x1b[36m[${step}]\x1b[0m ${msg}`);
const success = (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const error = (msg: string, err: any) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error(
    `\x1b[31m❌ ${msg}\x1b[0m`,
    status ? `status=${status}` : "",
    data ? JSON.stringify(data, null, 2) : (err.stack || err.message || err),
  );
};

async function runSimulation() {
  try {
    const suffix = Math.floor(Math.random() * 10000);
    const clientEmail = `client${suffix}@test.com`;
    const providerEmail = `provider${suffix}@test.com`;
    const password = "securePass123!";
    const clientPhone = `11${900000000 + Math.floor(Math.random() * 99999)}`;
    const providerPhone = `11${800000000 + Math.floor(Math.random() * 99999)}`;

    log("SETUP", "Initializing Scenarios...");

    // 1. Register Client
    log("STEP 1", `Registering Client: ${clientEmail}`);
    const clientMockToken = `MOCK_TOKEN_${clientEmail}`;
    const regClient = await axios.post(`${API_URL}/auth/register`, {
      token: clientMockToken,
      email: clientEmail,
      name: "João Cliente",
      role: "client",
      phone: clientPhone,
    });
    const clientToken = clientMockToken;
    const clientId = regClient.data.user.id;
    success(`Client registered (ID: ${clientId})`);

    // 2. Register Provider
    log("STEP 2", `Registering Provider: ${providerEmail}`);
    const providerMockToken = `MOCK_TOKEN_${providerEmail}`;
    const regProvider = await axios.post(`${API_URL}/auth/register`, {
      token: providerMockToken,
      email: providerEmail,
      name: "Maria Provider",
      role: "provider",
      phone: providerPhone,
    });
    const providerToken = providerMockToken;
    const providerId = regProvider.data.user.id;
    success(`Provider registered (ID: ${providerId})`);

    // Set provider location & professions
    await pool.query(
      "UPDATE providers SET latitude = ?, longitude = ? WHERE user_id = ?",
      [-23.551, -46.632, providerId],
    );
    await pool.query(
      "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
      [providerId, 1] // Assuming 1 = Encanador
    );

    // --- SCENARIO A: URGENT SERVICE (Full Flow) ---
    log("\n[SCENARIO A]", "URGENT SERVICE - Fix Sink");

    // Create Service
    const createService = await axios.post(`${API_URL}/services`, {
      category_id: 1, // Encanamento
      description: "Pia vazando muito, urgente!",
      latitude: -23.55052,
      longitude: -46.633308,
      address: "Rua Augusta, 1000",
      price_estimated: 150.0,
      price_upfront: 45.0,
    }, { headers: { Authorization: `Bearer ${clientToken}` } }
    );
    const serviceId = createService.data.id;
    success(`Service Created (ID: ${serviceId})`);

    // FORCE STATUS TO PENDING (Skip Payment)
    await pool.query("UPDATE service_requests SET status = 'pending' WHERE id = ?", [serviceId]);
    log("DB", "Forced service status to 'pending'");

    // Provider Validates
    const available = await axios.get(`${API_URL}/services/available`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (available.data.services.find((s: any) => s.id === serviceId)) {
      success("Provider sees service in dashboard");
    }

    // Accept
    await axios.post(`${API_URL}/services/${serviceId}/accept`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
    success("Provider Accepted");

    // Chat
    await axios.post(`${API_URL}/chat/${serviceId}/messages`, { content: "Estou indo!" }, { headers: { Authorization: `Bearer ${providerToken}` } });
    log("CHAT", "Message sent");

    // Arrive
    await axios.post(`${API_URL}/services/${serviceId}/provider-arrived`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
    success("Provider Arrived (Notification Triggered)");

    // Start
    await axios.post(`${API_URL}/services/${serviceId}/start`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
    success("Service Started");

    // Edit Request (Optional Addition)
    log("FLOW", "Provider requesting additional value...");
    const editReq = await axios.post(`${API_URL}/services/${serviceId}/edit-request`, {
      reason: "Peça extra necessária",
      additional_value: 50.00
    }, { headers: { Authorization: `Bearer ${providerToken}` } });
    success(`Edit Request Created (ID: ${editReq.data.id})`);

    // Client Accepts Edit
    await axios.post(`${API_URL}/services/${serviceId}/edit-request/${editReq.data.id}/accept`, {}, { headers: { Authorization: `Bearer ${clientToken}` } });
    success("Client Accepted Additional Cost");

    // Complete
    await axios.post(`${API_URL}/services/${serviceId}/complete`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
    success("Service Completed");


    // --- SCENARIO B: SCHEDULED BARBER ---
    log("\n[SCENARIO B]", "SCHEDULED SERVICE - Barber for Tomorrow");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createBarber = await axios.post(`${API_URL}/services`, {
      category_id: 3, // Beleza/Barbearia (assuming ID 3)
      description: "Corte de cabelo e barba",
      latitude: -23.55052,
      longitude: -46.633308,
      address: "Minha Casa",
      price_estimated: 80.0,
      price_upfront: 20.0,
      scheduled_at: tomorrow.toISOString()
    }, { headers: { Authorization: `Bearer ${clientToken}` } }
    );
    const barberId = createBarber.data.id;
    success(`Scheduled Service Created (ID: ${barberId}) for ${tomorrow.toISOString()}`);

    // FORCE STATUS TO PENDING (Scenario B)
    await pool.query("UPDATE service_requests SET status = 'pending' WHERE id = ?", [barberId]);

    // Provider accepts
    await axios.post(`${API_URL}/services/${barberId}/accept`, {}, { headers: { Authorization: `Bearer ${providerToken}` } });
    success("Barber Accepted Schedule");


    console.log("\n\x1b[32m✨ FULL SIMULATION SCENARIOS COMPLETED! ✨\x1b[0m");

  } catch (err) {
    error("Simulation Failed", err);
  }
}

async function runLoadTest() {
  const password = "securePass123!";
  const clients: { id: number; token: string; email: string }[] = [];
  const providers: { id: number; token: string; email: string }[] = [];
  const services: { id: string; clientId: number }[] = [];

  const numClients = 100;
  const numProviders = 45;
  const servicesPerClient = 10;

  try {
    log("LOAD", `🚀 Starting Massive Load Test: ${numClients} clients, ${numProviders} providers`);

    // 1. Register Clients
    log("LOAD", "Registering Clients...");
    const clientPromises = Array.from({ length: numClients }).map((_, i) => {
      const email = `client_mass_${Date.now()}_${i}@test.com`;
      const mockToken = `MOCK_TOKEN_${email}`;
      return axios.post(`${API_URL}/auth/register`, {
        token: mockToken,
        email, name: `Cliente ${i}`, role: "client",
        phone: `119${Math.floor(10000000 + Math.random() * 90000000)}`
      }).then(res => ({ id: res.data.user.id, token: mockToken, email }));
    });
    const registeredClients = await Promise.all(clientPromises);
    clients.push(...registeredClients);
    success(`${clients.length} Clients registered.`);

    // 2. Register Providers & Setup Professions
    log("LOAD", "Registering Providers...");
    for (let i = 0; i < numProviders; i++) {
      const email = `prov_mass_${Date.now()}_${i}@test.com`;
      const mockToken = `MOCK_TOKEN_${email}`;
      const reg = await axios.post(`${API_URL}/auth/register`, {
        token: mockToken,
        email, name: `Prestador ${i}`, role: "provider",
        phone: `119${Math.floor(10000000 + Math.random() * 90000000)}`
      });
      const pId = reg.data.user.id;
      providers.push({ id: pId, token: mockToken, email });

      // Assign random professions to ensure they can see services
      await pool.query("INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?), (?, ?)", [pId, 1, pId, 2]);
      await pool.query("UPDATE providers SET latitude = -23.55, longitude = -46.63 WHERE user_id = ?", [pId]);
    }
    success(`${providers.length} Providers registered and configured.`);

    // 3. Create Services (1.000 Total)
    log("LOAD", `Creating ${numClients * servicesPerClient} Services...`);
    for (const c of clients) {
      const servicePromises = Array.from({ length: servicesPerClient }).map(async (k) => {
        const create = await axios.post(`${API_URL}/services`, {
          category_id: (Math.floor(Math.random() * 5)) + 1,
          description: `Stress Test Service ${uuidv4().slice(0, 8)}`,
          latitude: -23.55 + Math.random() * 0.05,
          longitude: -46.63 + Math.random() * 0.05,
          address: `Rua de Teste ${k}`,
          price_estimated: 50 + Math.random() * 200,
          price_upfront: 20
        }, { headers: { Authorization: `Bearer ${c.token}` } });
        return { id: create.data.id, clientId: c.id };
      });
      const created = await Promise.all(servicePromises);
      services.push(...created);
    }
    success(`${services.length} Services created.`);

    // 4. Force Services to Pending (to bypass payment simulation)
    log("LOAD", "Moving services to 'pending' via DB...");
    await pool.query("UPDATE service_requests SET status = 'pending' WHERE status = 'waiting_payment'");

    // 5. Random Accepts & Rejections
    log("LOAD", "Simulating Random Accepts & Rejections...");
    const acceptPromises = services.map(async (s) => {
      const p = providers[Math.floor(Math.random() * providers.length)];
      // 30% chance of rejection before accept (just to test the endpoint)
      if (Math.random() < 0.3) {
        await axios.post(`${API_URL}/services/${s.id}/reject`, {}, { headers: { Authorization: `Bearer ${p.token}` } }).catch(() => { });
      }

      // Try accept
      return axios.post(`${API_URL}/services/${s.id}/accept`, {}, { headers: { Authorization: `Bearer ${p.token}` } })
        .then(() => true)
        .catch(e => e.response?.status === 409 ? false : false);
    });
    const results = await Promise.all(acceptPromises);
    const acceptedCount = results.filter(r => r).length;
    success(`${acceptedCount} Services accepted by random providers.`);

    // 6. Rapid Chat Messages (Sample 100 services for chat to avoid timeout)
    log("LOAD", "Simulating Chat for a sample of 100 services...");
    const chatSample = services.slice(0, 100);
    const chatPromises = chatSample.map(async (s) => {
      const client = clients.find(c => c.id === s.clientId)!;
      const prov = providers[Math.floor(Math.random() * providers.length)];

      await axios.post(`${API_URL}/chat/${s.id}/messages`, { content: "Pode vir?" }, { headers: { Authorization: `Bearer ${client.token}` } }).catch(() => { });
      await axios.post(`${API_URL}/chat/${s.id}/messages`, { content: "Estou a caminho agora mesmo!" }, { headers: { Authorization: `Bearer ${prov.token}` } }).catch(() => { });
    });
    await Promise.all(chatPromises);
    success("Chat simulation completed for sample.");

    success(`✨ MASSIVE LOAD TEST COMPLETED: Clients=${clients.length}, Providers=${providers.length}, Services=${services.length}`);

  } catch (err) {
    error("Massive Load Test Failed", err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const isLoad = process.env.MODE === "load" || args.includes("--load");
if (isLoad) {
  runLoadTest();
} else {
  runSimulation();
}
