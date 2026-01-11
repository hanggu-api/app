import pool from "../database/db";

async function checkData() {
  try {
    console.log("--- Categories ---");
    const [cats]: any = await pool.query("SELECT * FROM service_categories");
    console.table(cats);

    console.log("\n--- Professions (ID, Name, CategoryID) ---");
    const [profs]: any = await pool.query("SELECT id, name, category_id FROM professions");
    console.table(profs);

    console.log("\n--- Provider Professions ---");
    const [pp]: any = await pool.query(`
      SELECT pp.*, p.name as profession_name, u.full_name, u.email 
      FROM provider_professions pp
      JOIN professions p ON pp.profession_id = p.id
      JOIN users u ON pp.provider_user_id = u.id
    `);
    console.table(pp);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

checkData();
