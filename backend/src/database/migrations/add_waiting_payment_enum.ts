import pool from "../db";
import logger from "../../utils/logger";

async function run() {
  try {
    console.log(
      "Starting migration: Adding waiting_payment to service_requests status enum...",
    );

    // We need to modify the column definition.
    // Current: enum('pending','accepted','in_progress','completed','cancelled')
    // New: enum('waiting_payment','pending','accepted','in_progress','completed','cancelled')

    await pool.query(`
            ALTER TABLE service_requests 
            MODIFY COLUMN status ENUM('waiting_payment', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled') 
            NOT NULL DEFAULT 'waiting_payment';
        `);

    console.log("Migration successful: Status enum updated.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
