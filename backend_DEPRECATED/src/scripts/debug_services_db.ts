import pool from "../database/db";

async function run() {
    try {
        const [rows]: any = await pool.query("SELECT id, status, status_updated_at, completed_at, created_at FROM service_requests ORDER BY created_at DESC LIMIT 5");
        console.log("Last 5 Service Requests:");
        console.table(rows);
    } catch (error) {
        console.error("Error fetching services:", error);
    } finally {
        process.exit(0);
    }
}

run();
