
import pool from "../src/database/db";

async function listProfessions() {
  try {
    const [rows] = await pool.query("SELECT id, name, service_type, category_id FROM professions ORDER BY name");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listProfessions();
