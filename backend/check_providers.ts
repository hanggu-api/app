
import pool from "./src/database/db";

async function listProviders() {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.full_name, u.role, GROUP_CONCAT(p.name) as professions
      FROM users u
      LEFT JOIN provider_professions pp ON u.id = pp.provider_user_id
      LEFT JOIN professions p ON pp.profession_id = p.id
      WHERE u.role = 'provider'
      GROUP BY u.id
    `);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listProviders();
