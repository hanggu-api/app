
import dotenv from 'dotenv';
dotenv.config();
import pool from "../database/db";

async function run() {
    const [rows]: any = await pool.query(
        `SELECT user_id, latitude, longitude FROM providers WHERE user_id = 835`
    );
    console.log('Provider 835:', rows[0]);
    
    // Also check provider_locations
    const [rtRows]: any = await pool.query(
        `SELECT provider_id, latitude, longitude FROM provider_locations WHERE provider_id = 835`
    );
    console.log('RTDB Location for 835:', rtRows[0]);
}

run();
