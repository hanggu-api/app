import pool from "../database/db";

async function cleanTokens() {
    try {
        await pool.query("DELETE FROM user_devices WHERE user_id = 835");
        console.log("Deleted tokens for user 835");
    } catch (error) {
        console.error(error);
    } finally {
        await pool.closePool();
    }
}

cleanTokens();
