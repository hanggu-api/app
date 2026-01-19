
import pool from "../src/database/db";
import { RowDataPacket } from "mysql2";

async function showTables() {
    try {
        const [rows] = await pool.query("SHOW TABLES") as [RowDataPacket[], any];
        console.log("Tables:", rows.map(r => Object.values(r)[0]));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
showTables();
