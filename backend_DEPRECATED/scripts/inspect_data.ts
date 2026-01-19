import pool from "../src/database/db";

async function inspect() {
    try {
        const [professions]: any = await pool.query("SELECT * FROM professions WHERE name IN ('Mecânico', 'Pet Shop', 'Técnico de Informática')");
        console.log("Professions:", JSON.stringify(professions, null, 2));

        const [tasks]: any = await pool.query("SELECT * FROM task_catalog WHERE name LIKE '%freio%' OR name LIKE '%notebook%' OR name LIKE '%cachorro%'");
        console.log("Tasks:", JSON.stringify(tasks, null, 2));

        process.exit(0);
    } catch (error) {
        console.error("Error inspecting data:", error);
        process.exit(1);
    }
}

inspect();
