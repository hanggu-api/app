import pool from "./src/database/db";

async function migrate() {
  try {
    console.log("Adding profession column to service_requests...");
    await pool.query(`
            ALTER TABLE service_requests
            ADD COLUMN profession VARCHAR(128) NULL AFTER category_id;
        `);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit();
  }
}

migrate();
