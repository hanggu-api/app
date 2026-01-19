
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

async function findProviders() {
    try {
        console.log("Searching for providers...");
        
        // Query users with role 'provider'
        // Also try to join with provider_profiles if it exists, but let's start simple
        const [rows] = await pool.query(`
            SELECT id, full_name, email, phone, role, created_at 
            FROM users 
            WHERE role = 'provider' 
            ORDER BY created_at DESC 
            LIMIT 10
        `) as [RowDataPacket[], any];

        console.log("Recent Providers:");
        rows.forEach(r => {
            console.log(`ID: ${r.id}, Name: ${r.full_name}, Email: ${r.email}, Phone: ${r.phone}`);
        });

        // Also try to find if there is a category column or table
        try {
             const [catRows] = await pool.query(`
                SELECT u.id, u.full_name, p.category
                FROM users u
                JOIN provider_profile p ON u.id = p.user_id
                WHERE u.role = 'provider' AND (p.category LIKE '%pedreiro%' OR p.category LIKE '%construction%')
                LIMIT 5
            `) as [RowDataPacket[], any];
            
            if (catRows.length > 0) {
                console.log("\nProviders with 'pedreiro' category:");
                catRows.forEach(r => console.log(JSON.stringify(r)));
            } else {
                console.log("\nNo specific 'pedreiro' providers found in provider_profile (or table/column missing).");
            }
        } catch (e) {
             console.log("\nCould not query provider_profile (table might not exist or schema differs). Error:", (e as any).message);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findProviders();
