
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { RowDataPacket } from 'mysql2';
import pool from '../database/db';
import { providerDispatcher } from '../services/providerDispatcher';

dotenv.config();

// Configuration
const PROVIDER_ID = 835; // Motorola
const CLIENT_ID = 836;   // Emulator

async function createRefrigerationService() {
  try {
    console.log("🛠️ Creating Refrigeration Service Test...");

    // 1. Get Profession ID for "Técnico de Refrigeração" or similar
    const [professions] = await pool.query(
      "SELECT * FROM professions WHERE name LIKE '%Refrigera%' OR name LIKE '%Tecnico%' LIMIT 1"
    ) as [RowDataPacket[], any];

    if (professions.length === 0) {
      console.error("❌ Profession 'Refrigeração' not found in DB.");
      process.exit(1);
    }

    const profession = professions[0];
    console.log(`✅ Found Profession: ${profession.name} (ID: ${profession.id})`);

    // 2. Ensure Provider 835 has this profession (INSERT IGNORE to avoid duplicates)
    // Note: provider_professions uses 'provider_user_id'
    await pool.query(
      `INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)`,
      [PROVIDER_ID, profession.id]
    );
    console.log(`✅ Ensured Provider ${PROVIDER_ID} has profession ${profession.id}`);

    // 3. Ensure Provider 835 is ONLINE
    await pool.query(
      `UPDATE providers SET is_online = 1 WHERE user_id = ?`,
      [PROVIDER_ID]
    );
    console.log(`✅ Ensured Provider ${PROVIDER_ID} is Online`);

    // 4. Ensure Provider 835 Location in provider_locations table (used by getNearbyProviders)
    const lat = -23.550520;
    const lng = -46.633308;

    await pool.query(
      `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
       VALUES (?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()`,
      [PROVIDER_ID, lat, lng]
    );
    console.log(`✅ Ensured Provider ${PROVIDER_ID} Location in provider_locations`);

    // 5. Get Real Price from Task Catalog
    const [catalogTasks] = await pool.query(
      "SELECT * FROM task_catalog WHERE profession_id = ? AND active = 1",
      [profession.id]
    ) as [RowDataPacket[], any];

    // Create 3 different services
    const numberOfServices = 3;
    console.log(`🚀 Creating ${numberOfServices} different services...`);

    for (let i = 0; i < numberOfServices; i++) {
      let servicePrice = 150.00;
      let description = "Manutenção de Geladeira (Gás)";
      let taskName = "Manutenção Padrão";

      if (catalogTasks.length > 0) {
        // Pick a random task or specific one (rotate if possible or random)
        const taskIndex = i % catalogTasks.length; // Ensure we rotate through available tasks if few
        const task = catalogTasks.length >= numberOfServices
          ? catalogTasks[i] // Use distinct tasks if enough exist
          : catalogTasks[Math.floor(Math.random() * catalogTasks.length)]; // Random fallback

        servicePrice = parseFloat(task.unit_price);
        taskName = task.name;
        description = `${task.name} - ${task.keywords || 'Serviço especializado'}`;
        console.log(`[${i + 1}/${numberOfServices}] Selected Task: ${task.name} (R$ ${servicePrice})`);
      } else {
        console.log(`ℹ️ No catalog tasks found. Using market default: R$ ${servicePrice}`);
      }

      // 6. Create Service Request (UUID)
      const serviceId = randomUUID();

      // Status 'pending' triggers dispatch immediately
      const status = 'pending';

      // Add small offset to location so they don't stack exactly on top of each other
      const latOffset = (Math.random() - 0.5) * 0.002; // Approx 200m spread
      const lngOffset = (Math.random() - 0.5) * 0.002;

      await pool.query(
        `INSERT INTO service_requests (
            id,
            client_id, 
            category_id, 
            profession,
            description, 
            price_estimated, 
            price_upfront,
            status, 
            latitude, 
            longitude, 
            address, 
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          serviceId,
          CLIENT_ID,
          profession.category_id || 1,
          profession.name,
          description,
          servicePrice,
          servicePrice * 0.3, // Upfront 30%
          status,
          lat + latOffset,
          lng + lngOffset,
          `Av. Paulista, ${1000 + i * 100} - Bela Vista, São Paulo - SP`
        ]
      );

      console.log(`✅ Service [${i + 1}] Created. ID: ${serviceId}`);

      // 7. Trigger Dispatcher
      await providerDispatcher.startDispatch(serviceId);
      console.log(`🚀 Dispatch Triggered for Service [${i + 1}]`);

      // Small delay to ensure order
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log("✅ All services created and dispatched.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createRefrigerationService();
