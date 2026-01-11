
import pool from "../database/db";

async function checkOrphans() {
    try {
        console.log("Checking for orphaned dispatches...");
        
        // Find active dispatches where service_id does NOT exist in service_requests
        // Assuming table name is 'service_requests' based on context, checking if it exists first might be good but let's try direct query
        
        const [rows]: any = await pool.query(`
            SELECT sd.* 
            FROM service_dispatches sd
            LEFT JOIN service_requests sr ON sd.service_id = sr.id
            WHERE sd.status = 'active' AND sr.id IS NULL
        `);

        console.log(`Found ${rows.length} orphaned active dispatches.`);
        
        if (rows.length > 0) {
            console.log("Orphaned Dispatch IDs:", rows.map((r: any) => r.id));
            
            // Clean them up
            await pool.query(`
                UPDATE service_dispatches 
                SET status = 'cancelled_orphan' 
                WHERE id IN (?)
            `, [rows.map((r: any) => r.id)]);
            
            console.log("✅ Marked orphaned dispatches as 'cancelled_orphan'.");
        } else {
            console.log("✅ No orphaned dispatches found.");
        }

    } catch (e) {
        console.error("Error checking orphans:", e);
    }
    process.exit(0);
}

checkOrphans();
