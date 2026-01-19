
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/db';

dotenv.config();

const CLIENT_ID = 836; // User ID from emulator
const PROVIDER_ID = 835; // Provider ID (Motorola)
const PROFESSION_ID = 3744; // Técnico de Refrigeração

async function createSpecificService() {
    console.log("🛠️ Creating Specific Service Test (Limpeza Split - R$ 200)...");

    // 1. Ensure Provider is Online and Approved
    // Note: 'status' column does not exist on providers table. Using 'is_verified' on users table instead.
    await pool.query("UPDATE providers SET is_online = 1 WHERE user_id = ?", [PROVIDER_ID]);
    await pool.query("UPDATE users SET is_verified = 1 WHERE id = ?", [PROVIDER_ID]);
    await pool.query("INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)", [PROVIDER_ID, PROFESSION_ID]);

    // 2. Update Provider Location (Near Paulista)
    const lat = -23.561684;
    const lng = -46.655981;
    await pool.query(
        `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
         VALUES (?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?, updated_at = NOW()`,
        [PROVIDER_ID, lat, lng, lat, lng]
    ).catch(async (err) => {
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            // Fallback if updated_at doesn't exist
            await pool.query(
                `INSERT INTO provider_locations (provider_id, latitude, longitude) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?`,
                [PROVIDER_ID, lat, lng, lat, lng]
            );
        } else {
            throw err;
        }
    });

    // 3. Create Service Request
    const serviceId = uuidv4();
    const servicePrice = 200.00; // FIXED PRICE AS REQUESTED
    const description = "Limpeza de Ar Condicionado (Split)";
    const taskName = "Limpeza de Ar Condicionado (Split)";

    // Random offset for location to avoid stacking
    const latOffset = (Math.random() - 0.5) * 0.002;
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
            5, // Category Refrigeração
            'Técnico de Refrigeração',
            description,
            servicePrice,
            servicePrice * 0.3, // Upfront (not used for calculation logic right now but good to have)
            'pending',
            lat + latOffset,
            lng + lngOffset,
            `Av. Paulista, 1500 - Bela Vista, São Paulo - SP`
        ]
    );

    console.log(`✅ Service Created. ID: ${serviceId}`);
    console.log(`💰 Price: R$ ${servicePrice}`);
    console.log(`📉 Expected Net: R$ ${servicePrice * 0.85}`);

    // 4. Trigger Dispatch
    // We can just call the API endpoint or let the cron pick it up, 
    // but to be fast we can manually trigger the dispatcher logic here or just rely on the existing polling.
    // Since we are running local backend, the providerDispatcher should pick it up if it's running.
    // But to be sure, let's just log it.
    console.log("🚀 Service inserted. If Backend is running, Dispatcher should pick it up in < 10s.");

    process.exit(0);
}

createSpecificService().catch(console.error);
