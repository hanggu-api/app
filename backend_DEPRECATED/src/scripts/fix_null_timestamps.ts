import pool from "../database/db";

async function run() {
    console.log("🛠️ Fixing NULL status_updated_at for active services...");
    try {
        // For any service that is NOT completed/cancelled, if status_updated_at is NULL,
        // set it to created_at so the timer has something to work with.
        const [result]: any = await pool.query(
            "UPDATE service_requests SET status_updated_at = created_at WHERE status_updated_at IS NULL"
        );
        console.log(`✅ Updated ${result.affectedRows} records.`);
    } catch (error) {
        console.error("❌ Error fixing records:", error);
    } finally {
        process.exit(0);
    }
}

run();
