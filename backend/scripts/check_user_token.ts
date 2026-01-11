
import pool from "../src/database/db";

async function run() {
  try {
    const userId = 572;
    const [rows]: any = await pool.query("SELECT * FROM user_devices WHERE user_id = ?", [userId]);
    console.log(`Devices for user ${userId}:`, rows);
    
    const [user]: any = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
    console.log(`User details:`, user[0]);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

run();
