import pool from "../database/db";

async function run() {
  try {
    const conn = await pool.getConnection();
    console.log("Running migration...");

    try {
        await conn.query(`
            ALTER TABLE service_requests
            ADD COLUMN location_type ENUM('client', 'provider') DEFAULT 'client',
            ADD COLUMN arrived_at DATETIME NULL,
            ADD COLUMN payment_remaining_status ENUM('pending', 'paid') DEFAULT 'pending',
            ADD COLUMN contest_reason TEXT NULL,
            ADD COLUMN contest_status ENUM('none', 'pending', 'resolved') DEFAULT 'none';
        `);
        console.log("Columns added successfully.");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Columns already exist, skipping.");
        } else {
            console.error("Error adding columns:", e);
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
