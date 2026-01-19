
import { Client } from 'pg';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load .env from current directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL not found in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Connecting to Supabase (Postgres) via pg...');
    await client.connect();

    // List of tables to migrate in dependency order
    const tables = [
        'users',
        'service_categories', // dependencies for professions/services
        'professions',
        'providers', // depends on users
        'service_requests', // depends on clients, cats
        'service_tasks',
        'provider_professions',
        'payments', // depends on service_requests
        'reviews'
    ];

    // Create output directory
    const outputDir = path.resolve(__dirname, 'd1_migration');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Generate a cleanup script first
    let cleanupSql = 'PRAGMA defer_foreign_keys = ON;\n';
    // Delete in reverse dependency order
    for (let i = tables.length - 1; i >= 0; i--) {
        cleanupSql += `DELETE FROM ${tables[i]};\n`;
    }
    cleanupSql += 'PRAGMA defer_foreign_keys = OFF;\n';
    fs.writeFileSync(path.join(outputDir, '00_cleanup.sql'), cleanupSql);
    console.log('Generated 00_cleanup.sql');

    let fileIndex = 1;

    for (const table of tables) {
        try {
            console.log(`Fetching data from ${table}...`);

            const res = await client.query(`SELECT * FROM ${table}`);
            const data = res.rows;

            if (data.length === 0) {
                console.log(`No data in ${table}, skipping insert.`);
                continue;
            }

            console.log(`Found ${data.length} records in ${table}. Generating INSERTs...`);

            let sqlOutput = `/* Migration for ${table} */\n`;
            // We do NOT truncate here because we have a global cleanup script

            let batchCount = 0;
            for (const row of data) {
                const keys = Object.keys(row).join(', ');

                const values = Object.values(row).map(val => {
                    if (val === null || val === undefined) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (typeof val === 'boolean') return val ? 1 : 0;
                    if (val instanceof Date) return `'${val.toISOString()}'`;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return `'${String(val).replace(/'/g, "''")}'`;
                }).join(', ');

                sqlOutput += `INSERT INTO ${table} (${keys}) VALUES (${values});\n`;
                batchCount++;

                // Split into chunks of 100 rows to avoid memory issues on execute 
                // (though D1 limit is file size, mostly)
            }

            const fileName = `${String(fileIndex).padStart(2, '0')}_${table}.sql`;
            fs.writeFileSync(path.join(outputDir, fileName), sqlOutput);
            console.log(`Generated ${fileName}`);
            fileIndex++;

        } catch (e: any) {
            console.error(`Error processing table ${table}: ${e.message}`);
        }
    }

    // Generate a helper script to run them all
    const runScript = `
    # Auto-generated migration runner
    $files = Get-ChildItem "${outputDir}" -Filter *.sql | Sort-Object Name
    foreach ($file in $files) {
        Write-Host "Executing $($file.Name)..."
        npx wrangler d1 execute ai-service-db --remote --file "$($file.FullName)" --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error executing $($file.Name)" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "Migration Complete!" -ForegroundColor Green
  `;
    fs.writeFileSync(path.join(outputDir, 'run_migration.ps1'), runScript);

    await client.end();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
