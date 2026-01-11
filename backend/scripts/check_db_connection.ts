import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  console.log('Connecting to:', process.env.DB_HOST);
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      connectTimeout: 5000
    });
    console.log('✅ Connected successfully!');
    await conn.end();
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
  }
}
check();
