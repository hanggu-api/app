
import { Pool } from "pg";
import dotenv from "dotenv";
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Force Direct Connection for this check
// We need to bypass the Pooler to query system catalogs reliably if Transation mode is interfering, 
// though Session mode (5432) should be fine.
// Let's try to construct the direct URL manually if the env var is different.
const projectRef = process.env.SUPABASE_PROJECT_REF || 'hctrzaunbiokiecizkgi';
const dbPassword = process.env.DB_PASSWORD || 'Monica100@irisMAR100@';
const connectionString = `postgres://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`🔌 Connecting to: ${connectionString.replace(dbPassword, '*****')}`);

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Direct connection usually needs this
    max: 1
});

(async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Connected!");

        // 1. List Tables
        console.log("\n📂 Tables:");
        const resTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.table(resTables.rows.map(r => ({ table: r.table_name })));

        // 2. List Policies
        console.log("\n🛡️  RLS Policies:");
        const resPolicies = await client.query(`
            SELECT schemaname, tablename, policyname, cmd, roles 
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        if (resPolicies.rows.length === 0) {
            console.log("   (No policies found)");
        } else {
            console.table(resPolicies.rows);
        }

        client.release();
    } catch (e: any) {
        console.error("❌ Error:", e.message);
    } finally {
        await pool.end();
    }
})();
