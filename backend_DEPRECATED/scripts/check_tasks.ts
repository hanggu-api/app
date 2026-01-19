
import pool from "../src/database/db";

async function checkTasks() {
    try {
        const [rows]: any = await pool.query(`
            SELECT p.name, COUNT(t.id) as task_count 
            FROM professions p 
            LEFT JOIN task_catalog t ON p.id = t.profession_id 
            GROUP BY p.name 
            ORDER BY task_count DESC, p.name ASC
        `);
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTasks();
