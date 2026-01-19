import pool from "../database/db";
import { RowDataPacket } from "mysql2";

async function run() {
    try {
        console.log("=== Debugging Provider Services (Detailed) ===");

        // 1. List Providers matching 'barba'
        const [providers] = await pool.query(`
      SELECT u.id, u.full_name, p.commercial_name, p.user_id 
      FROM users u
      JOIN providers p ON u.id = p.user_id
      WHERE u.role = 'provider' AND (u.full_name LIKE '%barba%' OR p.commercial_name LIKE '%barba%')
    `) as [RowDataPacket[], any];

        console.log(`\nFound ${providers.length} providers:`);

        for (const p of providers) {
            console.log(`\n------------------------------------------------`);
            console.log(`Provider: ${p.full_name} (ID: ${p.id}, Commercial: ${p.commercial_name})`);

            // 2. Get Professions
            const [professions] = await pool.query(`
        SELECT p.id, p.name, p.service_type
        FROM professions p
        JOIN provider_professions pp ON p.id = pp.profession_id
        WHERE pp.provider_user_id = ?
      `, [p.id]) as [RowDataPacket[], any];

            if (professions.length === 0) {
                console.log("  [WARN] No professions assigned!");
            } else {
                console.log(`  Professions: ${professions.map((pr: any) => `${pr.name} (ID: ${pr.id})`).join(", ")}`);

                // 3. Check Catalog Services
                for (const prof of professions) {
                    const [services] = await pool.query(`
            SELECT id, name, unit_price, active
            FROM task_catalog
            WHERE profession_id = ?
          `, [prof.id]) as [RowDataPacket[], any];

                    console.log(`    -> Catalog Services for '${prof.name}': ${services.length} found`);
                    if (services.length > 0) {
                        services.forEach((s: any) => console.log(`       - ${s.name} (Active: ${s.active})`));
                    } else {
                        console.log(`       [WARN] No services found in catalog for this profession!`);
                    }
                }
            }

            // 4. Check Custom Services
            const [custom] = await pool.query(`
        SELECT id, name, price, active
        FROM provider_custom_services
        WHERE provider_id = ?
      `, [p.id]) as [RowDataPacket[], any];

            if (custom.length > 0) {
                console.log(`  Custom Services: ${custom.length} found`);
                custom.forEach((c: any) => console.log(`     * [Custom] ${c.name} (Active: ${c.active})`));
            } else {
                console.log(`  Custom Services: None`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error executing script:", error);
        process.exit(1);
    }
}

run();
