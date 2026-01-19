
import axios from "axios";
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

const API_URL = "http://localhost:4011";

async function triggerRequest() {
    try {
        console.log("🔍 Finding target provider (Pedreiro)...");

        // Find provider by email '103@gmail.com'
        const targetEmail = '103@gmail.com';
        const [providers] = await pool.query(`
            SELECT u.id, u.full_name, u.email, pl.latitude, pl.longitude, pp.profession_id, p.category_id, p.name as profession_name
            FROM users u
            JOIN provider_professions pp ON u.id = pp.provider_user_id
            JOIN professions p ON pp.profession_id = p.id
            LEFT JOIN provider_locations pl ON u.id = pl.provider_id
            WHERE u.email = ?
            LIMIT 1
        `, [targetEmail]) as [RowDataPacket[], any];

        if (providers.length === 0) {
            console.error(`❌ Provider with email '${targetEmail}' not found.`);
            process.exit(1);
        }

        const provider = providers[0];
        console.log(`✅ Target Provider Found: ${provider.full_name} (ID: ${provider.id}) - Profession: ${provider.profession_name}`);
        console.log(`📍 Location: ${provider.latitude}, ${provider.longitude}`);

        let lat = provider.latitude ? Number(provider.latitude) : null;
        let lon = provider.longitude ? Number(provider.longitude) : null;

        if (!lat || !lon) {
            console.warn("⚠️ Provider has no location. Using default São Paulo location.");
            lat = -23.5505;
            lon = -46.6333;
            
            // Update provider location in BOTH tables to ensure they are found
            console.log("📍 Updating provider location to ensure dispatch...");
            
            // Update provider_locations
            await pool.query(`
                INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
                VALUES (?, ?, ?, NOW()) 
                ON DUPLICATE KEY UPDATE latitude=?, longitude=?, updated_at=NOW()
            `, [provider.id, lat, lon, lat, lon]);

            // Update providers table (used by serviceRepository)
            await pool.query(`
                INSERT INTO providers (user_id, latitude, longitude) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE latitude=?, longitude=?
            `, [provider.id, lat, lon, lat, lon]);
        }

        // Create a temporary client
        const clientEmail = `client_pedreiro_test_${Date.now()}@test.com`;
        const password = "password123";
        const phone = "119" + Date.now().toString().slice(-8);

        console.log(`👤 Registering client: ${clientEmail}`);
        await axios.post(`${API_URL}/auth/register`, {
            email: clientEmail,
            password: password,
            name: "Client Looking for Pedreiro",
            role: "client",
            phone: phone
        });

        // Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: clientEmail,
            password: password
        });
        const token = loginRes.data.token;
        console.log("🔑 Client logged in.");

        // Create Service Request
        console.log("🚀 Creating Service Request...");
        const serviceData = {
            description: `Preciso de um ${provider.profession_name} urgente para serviço residencial.`,
            category_id: provider.category_id,
            latitude: lat,
            longitude: lon,
            address: "Rua Teste, 123, São Paulo, SP",
            profession: provider.profession_name, // Dynamic
            photos: []
        };

        const serviceRes = await axios.post(`${API_URL}/services`, serviceData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`✅ Service Request Created! ID: ${serviceRes.data.id}`);

        // 5. Create Payment (PIX) to trigger auto-approval and dispatch
        console.log("💳 Creating PIX payment to trigger dispatch (wait ~10s)...");
        try {
            await axios.post(`${API_URL}/payment/process`, {
                service_id: serviceRes.data.id,
                transaction_amount: 100,
                description: "Pagamento Teste Pedreiro",
                payment_method_id: "pix",
                payer: {
                    email: clientEmail,
                    first_name: "Client",
                    last_name: "Test",
                    identification: {
                        type: "CPF",
                        number: "19119119100"
                    }
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("✅ Payment Created! Waiting for backend auto-approval...");
        } catch (payErr: any) {
            console.error("❌ Payment Error:", payErr.response?.data || payErr.message);
        }

        console.log("📡 Dispatch triggered (will start in ~10s). Keep backend running!");

    } catch (error: any) {
        console.error("❌ Error:", error.response?.data || error.message);
    } finally {
        // await pool.end(); // Keep pool open if needed, but script should exit
        process.exit(0);
    }
}

triggerRequest();
