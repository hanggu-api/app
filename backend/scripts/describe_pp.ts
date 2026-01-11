
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

async function describeTable() {
    try {
        const [rows] = await pool.query("DESCRIBE provider_professions") as [RowDataPacket[], any];
        console.log("provider_professions columns:", rows.map(r => r.Field));
        
        // Also check provider_locations
        const [rows2] = await pool.query("DESCRIBE provider_locations") as [RowDataPacket[], any];
        console.log("provider_locations columns:", rows2.map(r => r.Field));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
describeTable();
