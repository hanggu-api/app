
import pool from "../db";

export async function run() {
    try {
        console.log("Updating provider_schedule_configs table...");

        await pool.query(`
            ALTER TABLE provider_schedule_configs
            ADD COLUMN lunch_start TIME DEFAULT NULL,
            ADD COLUMN lunch_end TIME DEFAULT NULL,
            ADD COLUMN slot_duration INT DEFAULT 30;
        `);

        console.log("provider_schedule_configs table updated successfully.");
    } catch (error) {
        console.error("Error updating provider_schedule_configs table:", error);
    }
}

run();
