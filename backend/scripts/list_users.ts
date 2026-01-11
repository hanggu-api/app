import pool from '../src/database/db';

async function listUsers() {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.full_name, u.email, p.document_value, u.created_at 
      FROM users u 
      JOIN providers p ON u.id = p.user_id 
      ORDER BY u.created_at DESC 
      LIMIT 5
    `);
    console.table(rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listUsers();
