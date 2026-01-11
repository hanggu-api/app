import db from "./database/db";

async function checkSettings() {
  try {
    const [rows] = await db.query("SELECT * FROM system_settings");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSettings();
