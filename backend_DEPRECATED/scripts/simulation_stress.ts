import pool from "../src/database/db";
import { v4 as uuidv4 } from "uuid";
import { providerDispatcher } from "../src/services/providerDispatcher";
import { ServiceRepository } from "../src/repositories/serviceRepository";
import logger from "../src/utils/logger";
import { redis } from "../src/platform";

// Utils
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cleanupUser(email: string) {
  const [rows]: any = await pool.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (rows.length === 0) return;
  const userId = rows[0].id;

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

  await pool.query(
    "UPDATE service_requests SET provider_id = NULL WHERE provider_id = ?",
    [userId],
  );
  await pool.query("DELETE FROM service_rejections WHERE provider_id = ?", [
    userId,
  ]);
  await pool.query("DELETE FROM providers WHERE user_id = ?", [userId]);
  await pool.query(
    "DELETE FROM provider_professions WHERE provider_user_id = ?",
    [userId],
  );
  await pool.query("DELETE FROM users WHERE id = ?", [userId]);
}

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

async function simulateService(
  serviceId: string,
  baseLat: number,
  baseLon: number,
  serviceName: string,
) {
  console.log(`[${serviceName}] Starting Dispatch...`);
  await providerDispatcher.startDispatch(serviceId);

  const serviceRepo = new ServiceRepository();
  let isRunning = true;
  let attempts = 0;

  while (isRunning) {
    // Random delay between checks to avoid perfect sync
    await delay(500 + Math.random() * 1000);

    const [rows]: any = await pool.query(
      "SELECT * FROM service_dispatches WHERE service_id = ?",
      [serviceId],
    );
    if (rows.length === 0) continue;

    const record = rows[0];

    if (record.status === "failed") {
      console.log(`[${serviceName}] FAILED (No one accepted)`);
      isRunning = false;
      break;
    }

    if (record.status === "completed") {
      console.log(`[${serviceName}] COMPLETED (Accepted!)`);
      isRunning = false;
      break;
    }

    let list: number[] = [];
    if (typeof record.provider_list === "string") {
      list = JSON.parse(record.provider_list);
    } else {
      list = record.provider_list;
    }

    if (!list || list.length === 0) {
      console.log(`[${serviceName}] No providers found in list.`);
      isRunning = false;
      break;
    }

    const currentProviderId = list[record.current_provider_index];
    const currentCycle = record.current_cycle;

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
      continue;
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
    if (!pInfo) {
      console.log(`[${serviceName}] Provider ${currentProviderId} not found`);
      continue;
    }

    const dist = getDistanceMeters(
      baseLat,
      baseLon,
      Number(pInfo.latitude),
      Number(pInfo.longitude),
    );

    // DECISION LOGIC (Random)
    // 5% chance to accept, 95% to reject (harder stress test)
    const isAccepted = Math.random() < 0.05;
    const action = isAccepted ? "ACCEPTED" : "REJECTED";
    const color = isAccepted ? "\x1b[32m" : "\x1b[31m"; // Green or Red
    const reset = "\x1b[0m";

    console.log(
      `[${serviceName}] Cycle ${currentCycle} | Provider: ${pInfo.full_name} | Dist: ${dist}m | Action: ${color}${action}${reset}`,
    );

    if (isAccepted) {
      await serviceRepo.acceptService(serviceId, currentProviderId);
      await providerDispatcher.stopDispatch(serviceId);
      isRunning = false;
    } else {
      await providerDispatcher.reject(serviceId, currentProviderId);
    }

    attempts++;
    if (attempts > 150) isRunning = false;
  }
}

async function run() {
  console.log("--- Starting STRESS Test Simulation ---");

  // 1. Get Profession IDs
  const [profRows]: any = await pool.query(
    'SELECT id, name FROM professions WHERE name IN ("Pedreiro", "Auto Mecânico")',
  );
  const professions: Record<string, number> = {};
  profRows.forEach((p: any) => (professions[p.name] = p.id));
  professions["Mecânico"] = professions["Auto Mecânico"];

  // 2. Create 30 Providers (Pedreiro)
  console.log("Ensuring 30 Providers (Pedreiro)...");
  const baseLat = -23.5505;
  const baseLon = -46.6333;
  const latStep = 0.0009; // 100m

  for (let i = 0; i < 30; i++) {
    const email = `pedreiro_sim_${i}@test.com`;
    // We assume they exist from previous run or create them if not
    // To be safe, let's just update their location or ensure they exist
    const [exist]: any = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    let userId: number;

    if (exist.length === 0) {
      const [uRes]: any = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, "hash", ?, "provider")',
        [email, `Pedreiro Sim ${i} (${i * 100}m)`],
      );
      userId = uRes.insertId;

      const lat = baseLat + i * latStep;
      const lon = baseLon;

      await pool.query(
        "INSERT INTO providers (user_id, latitude, longitude, is_online) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE latitude=?, longitude=?",
        [userId, lat, lon, lat, lon],
      );

      // Add to Redis (Geospatial)
      try {
        if (redis.status === "ready" || redis.status === "connect") {
          await redis.geoadd("provider_locations", lon, lat, String(userId));
        }
      } catch (e) {
        /* ignore redis error */
      }

      if (professions["Pedreiro"]) {
        await pool.query(
          "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
          [userId, professions["Pedreiro"]],
        );
      }
    } else {
      userId = exist[0].id;
    }
  }

  // 3. Create 5 Clients
  console.log("Ensuring 5 Clients...");
  const clientIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const email = `client_sim_${i}@test.com`;
    const [exist]: any = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (exist.length === 0) {
      const [uRes]: any = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, "hash", ?, "client")',
        [email, `Client Sim ${i}`],
      );
      clientIds.push(uRes.insertId);
    } else {
      clientIds.push(exist[0].id);
    }
  }

  // 4. Create 5 CONCURRENT Services
  console.log("\n--- Launching 5 Concurrent Services ---");
  const serviceRepo = new ServiceRepository();
  const [catRows]: any = await pool.query(
    "SELECT category_id FROM professions WHERE id = ?",
    [professions["Pedreiro"]],
  );
  const categoryId = catRows[0]?.category_id || 1;

  const servicePromises = [];

  for (let i = 0; i < 5; i++) {
    // Vary location slightly for each service
    const lat = baseLat + i * 0.0005; // 50m offset
    const lon = baseLon + i * 0.0005;

    const serviceId = await serviceRepo.create({
      client_id: clientIds[i],
      category_id: categoryId,
      profession: "Pedreiro",
      description: `STRESS TEST SERVICE ${i}`,
      latitude: lat,
      longitude: lon,
      address: `Stress St ${i}`,
      price_estimated: 500 + i * 50,
      price_upfront: 0,
    });

    servicePromises.push(simulateService(serviceId, lat, lon, `Svc-${i}`));
  }

  await Promise.all(servicePromises);

  console.log("\n--- Stress Test Finished ---");
  try {
    await redis.quit();
  } catch (e) {
    /* ignore quit error */
  }
  process.exit(0);
}

run().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
