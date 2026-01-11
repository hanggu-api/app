import pool from "../src/database/db";
import { v4 as uuidv4 } from "uuid";
import { providerDispatcher } from "../src/services/providerDispatcher";
import { ServiceRepository } from "../src/repositories/serviceRepository";
import logger from "../src/utils/logger";
import { redis } from "../src/platform";

// Utils
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cleanupUser(email: string) {
  // Find user
  const [rows]: any = await pool.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (rows.length === 0) return;
  const userId = rows[0].id;

  // Delete related service requests (as client)
  // First delete dependencies of service_requests
  const [services]: any = await pool.query(
    "SELECT id FROM service_requests WHERE client_id = ?",
    [userId],
  );
  for (const s of services) {
    await pool.query("DELETE FROM service_dispatches WHERE service_id = ?", [
      s.id,
    ]);
    await pool.query("DELETE FROM service_media WHERE service_id = ?", [s.id]);
    await pool.query("DELETE FROM service_tasks WHERE service_id = ?", [s.id]);
    await pool.query("DELETE FROM service_rejections WHERE service_id = ?", [
      s.id,
    ]);
    await pool.query("DELETE FROM service_edit_requests WHERE service_id = ?", [
      s.id,
    ]);
    await pool.query("DELETE FROM service_requests WHERE id = ?", [s.id]);
  }

  // Delete as provider (if any)
  // First, unlink from service_requests where this user is the provider
  await pool.query(
    "UPDATE service_requests SET provider_id = NULL WHERE provider_id = ?",
    [userId],
  );
  // Also delete any rejections or dispatches involving this provider?
  // rejections are linked to provider_id (which is user_id), so we should delete them
  await pool.query("DELETE FROM service_rejections WHERE provider_id = ?", [
    userId,
  ]);

  // Note: service_dispatches stores provider lists in JSON, so no FK constraint there usually,
  // but we should be careful. The error was specifically about service_requests_ibfk_3.

  await pool.query("DELETE FROM providers WHERE user_id = ?", [userId]);
  await pool.query(
    "DELETE FROM provider_professions WHERE provider_user_id = ?",
    [userId],
  );

  // Finally delete user
  await pool.query("DELETE FROM users WHERE id = ?", [userId]);
}

async function run() {
  console.log("--- Starting Complex Simulation ---");

  // 1. Get Profession IDs
  console.log("Fetching professions...");
  const [profRows]: any = await pool.query(
    'SELECT id, name FROM professions WHERE name IN ("Pedreiro", "Auto Mecânico", "Jardineiro")',
  );
  const professions: Record<string, number> = {};
  profRows.forEach((p: any) => (professions[p.name] = p.id));

  // Map "Mecânico" to "Auto Mecânico"
  professions["Mecânico"] = professions["Auto Mecânico"];

  console.log("Professions:", professions);

  // 2. Create 30 Providers (Pedreiro)
  console.log("Creating 30 Providers (Pedreiro) with 100m spacing...");
  const providerIds: number[] = [];
  const baseLat = -23.5505;
  const baseLon = -46.6333;

  // 0.0009 degrees is roughly 100m
  const latStep = 0.0009;

  for (let i = 0; i < 30; i++) {
    const email = `pedreiro_sim_${i}@test.com`;
    await cleanupUser(email);

    const [uRes]: any = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, "hash", ?, "provider")',
      [email, `Pedreiro Sim ${i} (${i * 100}m)`],
    );
    const userId = uRes.insertId;
    providerIds.push(userId);

    // Create Provider Profile
    const lat = baseLat + i * latStep;
    const lon = baseLon;

    await pool.query(
      "INSERT INTO providers (user_id, latitude, longitude, is_online) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE latitude=?, longitude=?",
      [userId, lat, lon, lat, lon],
    );

    // Add to Redis (Geospatial)
    if (redis.status === "ready" || redis.status === "connect") {
      await redis.geoadd("provider_locations", lon, lat, String(userId));
    }

    // Link Profession
    if (professions["Pedreiro"]) {
      await pool.query(
        "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
        [userId, professions["Pedreiro"]],
      );
    }
  }
  console.log(`Created ${providerIds.length} Pedreiros.`);

  // 3. Create 5 Clients
  console.log("Creating 5 Clients...");
  const clientIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const email = `client_sim_${i}@test.com`;
    await cleanupUser(email);
    const [uRes]: any = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, "hash", ?, "client")',
      [email, `Client Sim ${i}`],
    );
    clientIds.push(uRes.insertId);
  }

  // 4. Create Background Services (Just to populate DB as requested)
  console.log("Creating 4 background services (Mecânico, Jardineiro)...");
  const serviceRepo = new ServiceRepository();

  const backgroundServices = [
    { prof: "Mecânico", client: 1 },
    { prof: "Jardineiro", client: 2 },
    { prof: "Pedreiro", client: 3 }, // Another random one
    { prof: "Mecânico", client: 4 },
  ];

  for (const s of backgroundServices) {
    if (!professions[s.prof]) continue;
    const [catRows]: any = await pool.query(
      "SELECT category_id FROM professions WHERE id = ?",
      [professions[s.prof]],
    );
    const catId = catRows[0]?.category_id || 1;

    await serviceRepo.create({
      client_id: clientIds[s.client],
      category_id: catId,
      profession: s.prof,
      description: `Background Service for ${s.prof}`,
      latitude: baseLat + 0.05, // Far away
      longitude: baseLon + 0.05,
      address: "Far Away St",
      price_estimated: 150,
      price_upfront: 0,
    });
  }

  // 5. Create TARGET Service (The Test Case)
  // Client 0 creates service for Pedreiro at Base Location (0m)
  console.log(
    "\n--- Creating TARGET Service for Pedreiro at Base Location ---",
  );

  const [catRows]: any = await pool.query(
    "SELECT category_id FROM professions WHERE id = ?",
    [professions["Pedreiro"]],
  );
  const categoryId = catRows[0]?.category_id || 1;

  const serviceId = await serviceRepo.create({
    client_id: clientIds[0],
    category_id: categoryId,
    profession: "Pedreiro",
    description: "TARGET SIMULATION SERVICE",
    latitude: baseLat,
    longitude: baseLon,
    address: "Simulation Center St",
    price_estimated: 500,
    price_upfront: 0,
  });
  console.log(`Target Service ID: ${serviceId}`);

  // 6. Start Dispatch
  console.log("Starting Dispatch for Target Service...");
  await providerDispatcher.startDispatch(serviceId);

  // 7. Monitor and Simulate Random Responses
  console.log(
    "Monitoring dispatch... Providers will randomly Accept or Reject.",
  );

  let isRunning = true;
  let attempts = 0;

  // Service Location
  const serviceLat = baseLat;
  const serviceLon = baseLon;

  // Helper for Haversine Distance (in meters)
  function getDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  while (isRunning) {
    await delay(1000); // Slow down to read output

    const [rows]: any = await pool.query(
      "SELECT * FROM service_dispatches WHERE service_id = ?",
      [serviceId],
    );
    if (rows.length === 0) continue;

    const record = rows[0];

    if (record.status === "failed") {
      console.log("\n--- Dispatch FAILED (No one accepted) ---");
      isRunning = false;
      break;
    }

    if (record.status === "completed") {
      console.log("\n--- Dispatch COMPLETED (Service Accepted!) ---");
      isRunning = false;
      break;
    }

    // Get current provider details
    let list: number[] = [];
    if (typeof record.provider_list === "string") {
      list = JSON.parse(record.provider_list);
    } else {
      list = record.provider_list;
    }

    const currentProviderId = list[record.current_provider_index];
    const currentCycle = record.current_cycle;

    // Check if we already acted for this provider in this cycle
    let history: any[] = [];
    if (typeof record.history === "string") {
      history = JSON.parse(record.history);
    } else if (record.history) {
      history = record.history;
    }

    const alreadyActed = history.some(
      (h: any) =>
        h.provider_id === currentProviderId && h.cycle === currentCycle,
    );

    if (alreadyActed) {
      continue; // Wait for dispatcher to move to next
    }

    // Fetch Provider Info for logging
    const [pRows]: any = await pool.query(
      `SELECT u.full_name, p.latitude, p.longitude 
             FROM users u 
             JOIN providers p ON u.id = p.user_id 
             WHERE u.id = ?`,
      [currentProviderId],
    );
    const pInfo = pRows[0];
    const dist = getDistanceMeters(
      serviceLat,
      serviceLon,
      Number(pInfo.latitude),
      Number(pInfo.longitude),
    );

    // DECISION LOGIC (Random)
    // Let's give a 10% chance to accept, 90% to reject
    const isAccepted = Math.random() < 0.1;
    const action = isAccepted ? "ACCEPTED" : "REJECTED";
    const color = isAccepted ? "\x1b[32m" : "\x1b[31m"; // Green or Red
    const reset = "\x1b[0m";

    console.log(
      `Cycle ${currentCycle} | Provider: ${pInfo.full_name} | Dist: ${dist}m | Action: ${color}${action}${reset}`,
    );

    if (isAccepted) {
      await serviceRepo.acceptService(serviceId, currentProviderId);
      await providerDispatcher.stopDispatch(serviceId);
      isRunning = false;
    } else {
      await providerDispatcher.reject(serviceId, currentProviderId);
    }

    attempts++;
    if (attempts > 100) isRunning = false;
  }

  console.log("\n--- Simulation Finished ---");
  await redis.quit();
  process.exit(0);
}

run().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
