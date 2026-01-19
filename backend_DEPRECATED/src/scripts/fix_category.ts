import pool from "../database/db";

async function fixCategory() {
  try {
    console.log("Updating category for Técnico de Refrigeração...");
    const [res]: any = await pool.query("UPDATE professions SET category_id = 5 WHERE name = 'Técnico de Refrigeração'");
    console.log("Result:", res);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

fixCategory();
