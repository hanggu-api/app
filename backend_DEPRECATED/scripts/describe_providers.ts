
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

async function describeProviders() {
    try {
        const [rows] = await pool.query("DESCRIBE providers") as [RowDataPacket[], any];
        console.log("providers table columns:", rows.map(r => r.Field));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
describeProviders();
