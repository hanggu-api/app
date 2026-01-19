
import pool from "../database/db";

async function run() {
  try {
    const [cats]: any = await pool.query("SELECT id, name FROM service_categories");
    console.table(cats);

    // Find "Chaveiro"
    const [prof]: any = await pool.query("SELECT * FROM professions WHERE name = 'Chaveiro'");
    console.table(prof);
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
