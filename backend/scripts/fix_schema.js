const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "projeto_figma",
  });

  try {
    console.log("🔌 Connected to database");

    console.log("🛠️ Altering payments table to support UUID in mission_id...");
    await connection.query(
      "ALTER TABLE payments MODIFY COLUMN mission_id VARCHAR(36)",
    );
    console.log("✅ payments.mission_id modified to VARCHAR(36)");
  } catch (error) {
    console.error("❌ Error altering table:", error);
  } finally {
    await connection.end();
  }
}

fixSchema();
