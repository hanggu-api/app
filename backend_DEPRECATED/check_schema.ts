
import pool from "./src/database/db";

async function describeTable() {
  try {
    const [rows] = await pool.query("DESCRIBE providers");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

describeTable();
