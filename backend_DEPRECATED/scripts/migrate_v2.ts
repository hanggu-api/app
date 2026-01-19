import pool from "../src/database/db";

async function migrate() {
    try {
        console.log("Checking for status_updated_at column...");
        const [rows]: any = await pool.query("SHOW COLUMNS FROM service_requests LIKE 'status_updated_at'");

        if (rows.length === 0) {
            console.log("Adding status_updated_at column to service_requests...");
            await pool.query("ALTER TABLE service_requests ADD COLUMN status_updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            console.log("Column added successfully!");
        } else {
            console.log("Column status_updated_at already exists.");
        }

        console.log("Checking for completed_at column...");
        const [rows2]: any = await pool.query("SHOW COLUMNS FROM service_requests LIKE 'completed_at'");
        if (rows2.length === 0) {
            console.log("Adding completed_at column to service_requests...");
            await pool.query("ALTER TABLE service_requests ADD COLUMN completed_at TIMESTAMP NULL");
            console.log("Column added successfully!");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        const db = require("../src/database/db").default;
        await db.closePool();
        process.exit(0);
    }
}

migrate();
