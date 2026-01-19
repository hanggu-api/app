
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    const [rows] = await pool.query('DESCRIBE provider_locations');
    console.log('Schema provider_locations:', rows);

    const [data] = await pool.query('SELECT * FROM provider_locations');
    console.log('Data provider_locations:', data);

  } catch(e) {
    console.error(e);
  }
  await pool.end();
}

main();
