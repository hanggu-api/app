import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function checkDatabases() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [rows] = await connection.query("SHOW DATABASES;");
    console.log("Databases:", rows);
  } catch (error) {
    console.error("Error listing databases:", error);
  } finally {
    await connection.end();
  }
}

checkDatabases();
