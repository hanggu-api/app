import pool from "../database/db";
import { RowDataPacket } from "mysql2";

async function run() {
    try {
        const [rows] = await pool.query(`
      SELECT u.id, u.full_name, p.commercial_name, p.user_id 
      FROM users u
      JOIN providers p ON u.id = p.user_id
      WHERE u.full_name LIKE '%barba%' OR p.commercial_name LIKE '%barba%'
    `) as [RowDataPacket[], any];

        console.log("Providers found:", rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
