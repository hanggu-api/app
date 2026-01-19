
import pool from '../src/database/db';
import fs from 'fs';
import path from 'path';

(async () => {
    try {
        console.log('📜 Dumping MySQL Schema...');

        // 1. Get List of Tables
        const [tables]: any = await pool.query("SHOW TABLES");
        const tableNames = tables.map((t: any) => Object.values(t)[0]);

        let schemaSQL = "";

        // 2. Get Create Statement for each table
        for (const tableName of tableNames) {
            try {
                const [rows]: any = await pool.query(`SHOW CREATE TABLE ${tableName}`);
                // rows[0] looks like { Table: 'users', 'Create Table': 'CREATE TABLE ...' }
                const createStmt = rows[0]['Create Table'];
                schemaSQL += `-- Table: ${tableName}\n`;
                schemaSQL += `${createStmt};\n\n`;
            } catch (err) {
                console.error(`Error dumping table ${tableName}:`, err);
            }
        }

        // 3. Save to file
        const backupDir = path.join(__dirname, '../backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const schemaFile = path.join(backupDir, `schema_dump_${Date.now()}.sql`);
        fs.writeFileSync(schemaFile, schemaSQL);

        console.log(`✅ Schema Dump successful! Saved to: ${schemaFile}`);

    } catch (e) {
        console.error('❌ Dump Failed:', e);
    } finally {
        process.exit(0);
    }
})();
