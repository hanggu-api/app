
import pool from "../src/database/db";

async function main() {
    try {
        const [rows] = await pool.query("DESCRIBE task_catalog");
        console.log("task_catalog columns:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
