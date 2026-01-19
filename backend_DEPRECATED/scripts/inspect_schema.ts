import pool from "../src/database/db";

async function inspect() {
    try {
        const [columns]: any = await pool.query("DESCRIBE professions");
        console.log("Professions Columns:", JSON.stringify(columns, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error inspecting schema:", error);
        process.exit(1);
    }
}

inspect();
