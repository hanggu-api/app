
import pool from "../src/database/db";

async function fixProfession() {
  try {
    console.log("Updating profession 'Eletricista' category_id to 2...");
    const [result] = await pool.query("UPDATE professions SET category_id = 2 WHERE name = ?", ["Eletricista"]);
    console.log("Update result:", result);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixProfession();
