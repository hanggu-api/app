import pool from "../src/database/db";

async function main() {
  try {
    console.log("Checking service_categories...");
    const [rows]: any = await pool.query("SELECT * FROM service_categories");
    console.log(`Found ${rows.length} categories.`);

    if (rows.length === 0) {
      console.log("Seeding default category...");
      await pool.query(
        "INSERT INTO service_categories (name, icon_slug) VALUES ('Geral', 'default')",
      );
      console.log('Seeded "Geral" category.');
    } else {
      console.log("Categories exist:", rows);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
