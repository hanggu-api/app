
import pool from "../database/db";

async function run() {
  try {
    console.log("Updating Chaveiro category...");
    // Update Chaveiro to category 5 (Manutenção)
    await pool.query("UPDATE professions SET category_id = 5 WHERE name = 'Chaveiro'");
    
    // Also update other common professions if null
    await pool.query("UPDATE professions SET category_id = 5 WHERE name = 'Gesseiro' AND category_id IS NULL");
    await pool.query("UPDATE professions SET category_id = 5 WHERE name = 'Serralheiro' AND category_id IS NULL");
    await pool.query("UPDATE professions SET category_id = 6 WHERE name = 'Diarista' AND category_id IS NULL");

    console.log("Updating Service Request category...");
    // Update the specific service request to match category 5
    // ID from previous debug: 8ea2130c-08af-459c-b728-890c5507d359
    await pool.query("UPDATE service_requests SET category_id = 5 WHERE id = '8ea2130c-08af-459c-b728-890c5507d359'");

    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
