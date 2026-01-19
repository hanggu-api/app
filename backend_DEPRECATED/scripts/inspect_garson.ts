import pool from "../src/database/db";

async function inspect() {
    try {
        const [rows]: any = await pool.query("SELECT * FROM professions WHERE name LIKE '%Garson%' OR name LIKE '%Garçom%'");
        console.log("Garson Data:", JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

inspect();
