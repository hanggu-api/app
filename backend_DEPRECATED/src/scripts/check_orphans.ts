
import pool from "../database/db";

async function checkOrphans() {
  try {
    console.log("Checking for orphaned dispatches...");
    const [rows]: any = await pool.query(`
      SELECT sd.service_id, sd.status 
      FROM service_dispatches sd
      LEFT JOIN service_requests sr ON sd.service_id = sr.id
      WHERE sr.id IS NULL AND sd.status = 'active'
    `);

    console.log(`Found ${rows.length} orphaned active dispatches.`);
    
    if (rows.length > 0) {
      console.log("Cleaning up...");
      for (const row of rows) {
        console.log(`Cancelling orphan dispatch for service ${row.service_id}`);
        await pool.query("UPDATE service_dispatches SET status = 'cancelled_orphan' WHERE service_id = ?", [row.service_id]);
      }
      console.log("Cleanup complete.");
    }
  } catch (error) {
    console.error("Error checking orphans:", error);
  } finally {
    process.exit(0);
  }
}

checkOrphans();
