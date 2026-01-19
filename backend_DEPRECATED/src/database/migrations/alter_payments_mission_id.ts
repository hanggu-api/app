import pool from "../db";

async function run() {
  try {
    console.log(
      "Starting migration: Altering payments.mission_id to VARCHAR(36)...",
    );

    await pool.query(`
            ALTER TABLE payments 
            MODIFY COLUMN mission_id VARCHAR(36) NOT NULL;
        `);

    console.log("Migration successful: payments.mission_id updated.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
