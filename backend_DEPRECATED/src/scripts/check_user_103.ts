
import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkUser() {
  try {
    const [users]: any = await pool.query("SELECT * FROM users WHERE email = '103@gmail.com'");
    if (users.length === 0) {
      console.log("User 103@gmail.com NOT FOUND");
      return;
    }
    const user = users[0];
    console.log("User found:", user.id, user.email, user.user_type);

    /*
    const [profiles]: any = await pool.query("SELECT * FROM provider_profile WHERE user_id = ?", [user.id]);
    if (profiles.length === 0) {
      console.log("Provider profile NOT FOUND");
    } else {
      console.log("Provider profile:", profiles[0]);
    }

    const [locations]: any = await pool.query("SELECT * FROM provider_locations WHERE provider_id = ?", [user.id]); // Note: schema might be provider_user_id, checking both if needed
    console.log("Locations (provider_id):", locations);
    
    // Check services/categories
    const [services]: any = await pool.query(`
        SELECT s.id, s.name, c.name as category_name 
        FROM services s 
        JOIN categories c ON s.category_id = c.id 
        WHERE s.provider_id = ?`, [user.id]);
    console.log("Services:", services);
    */

    // Check user devices
    const [devices]: any = await pool.query("SELECT * FROM user_devices WHERE user_id = ?", [user.id]);
    console.log("User Devices:", devices);

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkUser();
