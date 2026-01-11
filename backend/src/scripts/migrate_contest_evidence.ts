import pool from "../database/db";

async function run() {
  try {
    const conn = await pool.getConnection();
    console.log("Running migration for contest evidence...");

    try {
        await conn.query(`
            ALTER TABLE service_requests
            ADD COLUMN contest_evidence JSON NULL;
        `);
        console.log("Column contest_evidence added successfully.");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column contest_evidence already exists.");
        } else {
            console.error("Error adding column:", e);
        }
    }

    conn.release();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
