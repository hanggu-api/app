
import dotenv from 'dotenv';
import pool from "../database/db";
dotenv.config();

async function run() {
    try {
        const userId = 835;
        console.log(`Checking tokens for user ${userId}...`);

        const [rows]: any = await pool.query(
            "SELECT * FROM user_devices WHERE user_id = ?",
            [userId]
        );

        if (rows.length > 0) {
            console.log(`✅ Found ${rows.length} tokens for user ${userId}:`);
            rows.forEach((r: any) => console.log(` - Token: ${r.token.substring(0, 20)}... | Platform: ${r.platform} | Last Active: ${r.last_active}`));
        } else {
            console.log(`❌ No tokens found for user ${userId} in user_devices table.`);
        }

        const [user]: any = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        console.log('User details:', user[0] ? { id: user[0].id, email: user[0].email } : 'User not found');

    } catch (error) {
        console.error("Error:", error);
    } finally {
        // await pool.end();
        process.exit(0);
    }
}

run();
