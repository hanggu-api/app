import pool from "../database/db";

async function checkSettings() {
    try {
        const [rows]: any = await pool.query("SELECT * FROM system_settings");
        console.log("Settings in DB:", JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // await pool.closePool(); // Assuming closePool exists based on error message
        process.exit(0);
    }
}

checkSettings();
