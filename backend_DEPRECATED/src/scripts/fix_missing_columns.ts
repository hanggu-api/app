import pool from "../database/db";

async function run() {
    console.log("🚀 Starting database fix: adding status_updated_at and completed_at to service_requests...");

    try {
        // Check if columns already exist to avoid errors
        const [columns]: any = await pool.query("SHOW COLUMNS FROM service_requests");
        const columnNames = columns.map((c: any) => c.Field);

        if (!columnNames.includes("status_updated_at")) {
            console.log("➕ Adding column: status_updated_at");
            await pool.query("ALTER TABLE service_requests ADD COLUMN status_updated_at TIMESTAMP NULL DEFAULT NULL");
        } else {
            console.log("✅ Column status_updated_at already exists.");
        }

        if (!columnNames.includes("completed_at")) {
            console.log("➕ Adding column: completed_at");
            await pool.query("ALTER TABLE service_requests ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL");
        } else {
            console.log("✅ Column completed_at already exists.");
        }

        console.log("🎉 Database fix completed successfully!");
    } catch (error) {
        console.error("❌ Error fixing database:", error);
    } finally {
        process.exit(0);
    }
}

run();
