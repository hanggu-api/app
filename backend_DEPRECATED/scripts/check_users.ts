
import pool from "../src/database/db";

async function main() {
    try {
        const [rows] = await pool.query("SELECT id, full_name, role FROM users LIMIT 5");
        console.log("Users:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
