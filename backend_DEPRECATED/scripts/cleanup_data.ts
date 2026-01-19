import pool from "../src/database/db";

async function cleanup() {
    try {
        console.log("🧹 Cleaning up junk professions...");
        const names = "('erweqwe', 'Garson', 'Garçom', 'Home Office', 'Barba', 'Cabelo', 'Depilação', 'Sobrancelha', 'Manicure', 'Pedicure', 'Estética', 'Massagem', 'Podologia')";

        // Delete tasks first
        const [taskRes]: any = await pool.query(`DELETE FROM task_catalog WHERE profession_id IN (SELECT id FROM professions WHERE name IN ${names} OR name LIKE '%Teste%')`);
        console.log(`✅ Deleted ${taskRes.affectedRows} tasks.`);

        // Delete professions
        const [profRes]: any = await pool.query(`DELETE FROM professions WHERE name IN ${names} OR name LIKE '%Teste%'`);
        console.log(`✅ Deleted ${profRes.affectedRows} professions.`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error cleaning up:", error);
        process.exit(1);
    }
}

cleanup();
