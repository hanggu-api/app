
import pool from "../database/db";

async function run() {
    try {
        const [rows]: any = await pool.query("SELECT email FROM users WHERE id = 835");
        console.log("User 835 Email:", rows[0]?.email);
    } catch (e) {
        console.error(e);
    } finally {
        // Close pool if possible, or just exit
        process.exit(0);
    }
}

run();
