import pool from "../db";
import logger from "../../utils/logger";

async function run() {
  try {
    console.log("Starting migration: Adding verification fields to service_requests...");

    const connection = await pool.getConnection();

    const ensureColumn = async (table: string, column: string, definition: string) => {
      try {
        const [rows]: any = await connection.query(
          "SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
          [table, column]
        );
        const c = Array.isArray(rows) ? Number(rows[0]?.c || 0) : 0;
        if (c === 0) {
          console.log(`Adding column ${column} to ${table}...`);
          await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          console.log(`Column ${column} added.`);
        } else {
          console.log(`Column ${column} already exists in ${table}.`);
        }
      } catch (e) {
        console.error(`Error adding column ${column}:`, e);
      }
    };

    await ensureColumn("service_requests", "validation_code", "VARCHAR(10) NULL");
    await ensureColumn("service_requests", "payment_remaining_status", "VARCHAR(32) DEFAULT 'pending'");
    await ensureColumn("service_requests", "proof_photo", "VARCHAR(255) NULL");
    await ensureColumn("service_requests", "proof_video", "VARCHAR(255) NULL");
    await ensureColumn("service_requests", "proof_code", "VARCHAR(255) NULL");

    console.log("Migration successful: Verification fields added.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
