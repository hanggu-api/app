
import pool from "../src/database/db";

async function checkProfession() {
  try {
    const [rows] = await pool.query("SELECT * FROM professions WHERE name = ?", ["Eletricista"]);
    console.log("Profession Eletricista:", rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkProfession();
