
import pool from "../src/database/db";

async function run() {
  try {
    console.log("Resetting provider schedules to 08:00 - 18:00 with lunch 12:00 - 13:00...");

    // Update existing configs
    await pool.query(`
      UPDATE provider_schedule_configs
      SET 
        start_time = '08:00:00',
        end_time = '18:00:00',
        lunch_start = '12:00:00',
        lunch_end = '13:00:00',
        slot_duration = 30,
        is_active = 1
    `);

    console.log("Schedules updated successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating schedules:", error);
    process.exit(1);
  }
}

run();
