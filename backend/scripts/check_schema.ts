
import pool from "../src/database/db";

async function checkSchema() {
  try {
    console.log("Checking schema...");
    const [rows] = await pool.query("DESCRIBE professions");
    console.log("Professions Table:", rows);
    
    const [rows2] = await pool.query("DESCRIBE service_categories");
    console.log("Service Categories Table:", rows2);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSchema();
