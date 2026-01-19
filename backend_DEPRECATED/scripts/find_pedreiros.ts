
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

async function findPedreiros() {
    try {
        console.log("Searching for 'pedreiro' providers...");
        
        // Try to find professions with name like pedreiro
        const [profs] = await pool.query("SELECT * FROM professions WHERE name LIKE '%pedreiro%' OR name LIKE '%constru%'") as [RowDataPacket[], any];
        console.log("Professions found:", profs);

        if (profs.length > 0) {
            const profIds = profs.map(p => p.id).join(',');
            
            // Find users linked to these professions
            // Assuming provider_professions has user_id or provider_id
            try {
                 const [rows] = await pool.query(`
                    SELECT u.id, u.full_name, u.email, u.phone, pr.name as profession
                    FROM users u
                    JOIN provider_professions pp ON u.id = pp.provider_id
                    JOIN professions pr ON pp.profession_id = pr.id
                    WHERE pp.profession_id IN (${profIds})
                    LIMIT 5
                `) as [RowDataPacket[], any];
                
                console.log("\nUsers with 'pedreiro' profession (joined on provider_id = u.id):");
                rows.forEach(r => console.log(JSON.stringify(r)));

                if (rows.length === 0) {
                     // Try joining on user_id if provider_id was wrong
                     const [rows2] = await pool.query(`
                        SELECT u.id, u.full_name, u.email, u.phone, pr.name as profession
                        FROM users u
                        JOIN provider_professions pp ON u.id = pp.user_id 
                        JOIN professions pr ON pp.profession_id = pr.id
                        WHERE pp.profession_id IN (${profIds})
                        LIMIT 5
                    `) as [RowDataPacket[], any];
                    console.log("\nUsers with 'pedreiro' profession (joined on user_id):");
                    rows2.forEach(r => console.log(JSON.stringify(r)));
                }

            } catch (e) {
                console.log("Query error:", (e as any).message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findPedreiros();
