
import pool from "../src/database/db";

async function updateProvidersToMaranhao() {
    try {
        console.log("Updating providers to Maranhão test location...");

        // Target Location (from user logs): -5.5057476, -47.453689
        const lat = -5.5057476;
        const lng = -47.453689;

        // 1. Update Provider 834 (tecnico refrige)
        await pool.query(`
            UPDATE providers 
            SET latitude = ?, longitude = ?, is_online = 1
            WHERE user_id = 834
        `, [lat, lng]);
        console.log("Updated Provider 834 (tecnico refrige): Online, at user location.");

        // 2. Update Provider 835 (chaveiro silva) - slightly offset
        await pool.query(`
            UPDATE providers 
            SET latitude = ?, longitude = ?, is_online = 1
            WHERE user_id = 835
        `, [lat - 0.01, lng - 0.01]);
        console.log("Updated Provider 835 (chaveiro silva): Online, nearby.");

        // 3. Verify
        const [rows]: any = await pool.query(`
            SELECT user_id, is_online, latitude, longitude 
            FROM providers 
            WHERE user_id IN (834, 835)
        `);
        console.table(rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateProvidersToMaranhao();
