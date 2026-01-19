
import pool from '../src/database/db';
import fs from 'fs';
import path from 'path';

(async () => {
    try {
        console.log('📦 Starting Database Backup...');

        // 1. Get List of Tables
        const [tables]: any = await pool.query("SHOW TABLES");
        const tableNames = tables.map((t: any) => Object.values(t)[0]);

        const backupData: Record<string, any[]> = {};

        // 2. Dump each table
        for (const tableName of tableNames) {
            console.log(`   - Dumping table: ${tableName}`);
            const [rows]: any = await pool.query(`SELECT * FROM ${tableName}`);
            backupData[tableName] = rows;
        }

        // 3. Save to file
        const backupDir = path.join(__dirname, '../backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFile = path.join(backupDir, `backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

        console.log(`✅ Backup successful! Saved to: ${backupFile}`);
        console.log(`Summary: ${Object.keys(backupData).length} tables backed up.`);

    } catch (e) {
        console.error('❌ Backup Failed:', e);
    } finally {
        process.exit(0);
    }
})();
