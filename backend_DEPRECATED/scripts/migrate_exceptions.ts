
import pool from "../src/database/db";

async function run() {
    try {
        console.log("Updating provider_schedule_exceptions table...");

        // Add is_closed column
        try {
            await pool.query("ALTER TABLE provider_schedule_exceptions ADD COLUMN is_closed TINYINT(1) DEFAULT 0 AFTER end_time");
            console.log("Added is_closed column.");
        } catch (e: any) {
            if (e.message.includes("Duplicate column")) {
                console.log("is_closed column already exists.");
            } else {
                throw e;
            }
        }

        // Increase size of start_time and end_time
        await pool.query("ALTER TABLE provider_schedule_exceptions MODIFY COLUMN start_time VARCHAR(10) NULL");
        await pool.query("ALTER TABLE provider_schedule_exceptions MODIFY COLUMN end_time VARCHAR(10) NULL");
        console.log("Modified time columns size.");

        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit();
    }
}

run();
