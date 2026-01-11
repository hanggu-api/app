import pool from "../database/db";

async function checkToken() {
    try {
        const [rows]: any = await pool.query("SELECT * FROM user_devices WHERE user_id = 835");
        console.log("Tokens for user 835:", rows);
    } catch (error) {
        console.error(error);
    } finally {
        await pool.closePool();
    }
}

checkToken();
