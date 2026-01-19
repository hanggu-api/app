
import axios from 'axios';
import { RowDataPacket } from 'mysql2';
import pool from '../database/db';

// Force API URL to Vercel for testing remote backend
// const API_URL = 'https://backend-iota-lyart-77.vercel.app/api';
// const API_URL = 'http://localhost:3000/api';
const API_URL = 'http://localhost:4011/api';

async function main() {
    console.log("TEST PRINT - FILE UPDATED");
    console.log("🚀 Starting Service Creation via API (Bypass Mode)...");

    const clientEmail = 'client@test.com';
    let clientId: number | null = null;

    // 1. Ensure Test Client Exists in DB (Direct SQL)
    try {
        const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ?", [clientEmail]);
        if (rows.length > 0) {
            clientId = rows[0].id;
            console.log(`✅ Test Client exists (ID: ${clientId})`);
        } else {
            console.log("⚠️ Test Client not found. Creating...");
            const [res] = await pool.query<any>(
                "INSERT INTO users (email, password_hash, full_name, role, phone) VALUES (?, ?, ?, ?, ?)",
                [clientEmail, 'bypass_hash', 'Test Client Bypass', 'client', '11999999999']
            );
            clientId = res.insertId;
            console.log(`✅ Created Test Client (ID: ${clientId})`);
        }
    } catch (dbError) {
        console.error("❌ DB Connection Error:", dbError);
        process.exit(1);
    }

    // 2. Verify Provider 835 Exists on Vercel (via API)
    console.log("🔍 Verifying Provider 835 on Vercel...");

    // Dynamic Location Fetch
    let providerLat = -23.550520;
    let providerLon = -46.633308;
    let providerAddress = 'Praça da Sé, São Paulo';

    try {
        const [locRows] = await pool.query<RowDataPacket[]>("SELECT latitude, longitude FROM provider_locations WHERE provider_id = 835");
        if (locRows.length > 0) {
            providerLat = parseFloat(locRows[0].latitude);
            providerLon = parseFloat(locRows[0].longitude);
            providerAddress = `Localização Atual do Prestador (${providerLat}, ${providerLon})`;
            console.log(`📍 Found Provider 835 at Realtime Location: ${providerLat}, ${providerLon}`);
        } else {
            console.log("⚠️ No realtime location found. Using default SP.");
        }
    } catch (e) {
        console.error("Error fetching provider location:", e);
    }

    // 3. Create Service using SUPER_TEST_TOKEN
    const token = 'SUPER_TEST_TOKEN';

    const serviceData = {
        category_id: 5, // 5 = Maintenance/Refrigeration
        description: 'Minha geladeira parou de gelar, preciso de um técnico de refrigeração urgente. (API TEST)',
        latitude: providerLat,
        longitude: providerLon,
        address: providerAddress,
        price_estimated: 150.00
    };

    console.log("📦 Creating Service...");
    try {
        const createRes = await axios.post(`${API_URL}/services`, serviceData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (createRes.data.success) {
            console.log("✅ Service Created Successfully!");
            console.log("Full Response:", JSON.stringify(createRes.data, null, 2));
            console.log("Service ID:", createRes.data.serviceId || createRes.data.service?.id);
        } else {
            console.error("❌ Service Creation Failed:", createRes.data);
        }
    } catch (e: any) {
        console.error("❌ API Error:", e.response?.data || e.message);
        // If 401, maybe bypass is not on Vercel yet.
    }

    process.exit(0);
}

main().catch(console.error);
