
import dotenv from 'dotenv';
import pool from "../database/db";
dotenv.config();

async function run() {
    try {
        console.log("🔍 Checking latest service and dispatch...");

        // Get specific service
    const targetId = 'fdfd8c3c-9e8c-440f-9e20-e5dc1f36ff7b';
    console.log(`Checking for Service UUID: ${targetId}`);

        const [services]: any = await pool.query(
            "SELECT id, description, created_at, status FROM service_requests WHERE id = ?",
            [targetId]
        );

        if (services.length > 0) {
            const service = services[0];
            console.log(`✅ Found Service: ID ${service.id} | Status: ${service.status} | Created: ${service.created_at}`);

            // Get dispatch record
            const [dispatches]: any = await pool.query(
                "SELECT * FROM service_dispatches WHERE service_id = ?",
                [service.id]
            );

            if (dispatches.length > 0) {
                const dispatch = dispatches[0];
                console.log(`✅ Dispatch Record Found:`);
                console.log(` - Status: ${dispatch.status}`);
                console.log(` - Provider List Raw:`, dispatch.provider_list);
                console.log(` - Provider List Type:`, typeof dispatch.provider_list);

                // Parse provider list
                try {
                    let providers = dispatch.provider_list;
                    if (typeof providers === 'string') {
                        providers = JSON.parse(providers);
                    }
                    console.log(` - Parsed Providers:`, providers);
                    const provider835 = Array.isArray(providers) && providers.includes(835);
                    console.log(` - Provider 835 in list? ${provider835 ? 'YES' : 'NO'}`);
                } catch (e) {
                    console.log(` - Error parsing provider list: ${e}`);
                }
            } else {
                console.log(`❌ No dispatch record found for service ${service.id}`);
            }
        } else {
            console.log(`❌ Service ${targetId} not found.`);

            console.log("Listing top 5 latest services:");
            const [latest]: any = await pool.query(
                "SELECT id, description, created_at FROM service_requests ORDER BY created_at DESC LIMIT 5"
            );
            latest.forEach((s: any) => console.log(` - ${s.created_at} | ${s.id} | ${s.description}`));
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

run();
