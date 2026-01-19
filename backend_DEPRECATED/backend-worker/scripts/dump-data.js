const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from main backend .env (Direct URL to avoid PgBouncer issues)
const CONNECTION_STRING = "postgresql://postgres.hctrzaunbiokiecizkgi:Monica100%40irisMAR100%40@aws-1-us-east-2.pooler.supabase.com:5432/postgres";

async function dump() {
  console.log('Connecting to Supabase...');
  const client = new Client({ connectionString: CONNECTION_STRING });

  try {
    await client.connect();
    console.log('Connected.');

    // Get all public tables except migrations
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
      ORDER BY table_name;
    `);

    const tables = res.rows.map(r => r.table_name);
    const outputPath = path.join(__dirname, '../migrations/0002_data_dump.sql');
    const stream = fs.createWriteStream(outputPath);

    console.log(`Found ${tables.length} tables. Starting dump to ${outputPath}...`);

    stream.write('-- Data dump from Supabase\n');
    stream.write('PRAGMA foreign_keys = OFF;\n');
    // D1 execute handles transactions implicitly or doesn't like explicit BEGIN/COMMIT in batch mode
    // stream.write('BEGIN TRANSACTION;\n\n');

    for (const table of tables) {
      console.log(`Processing table: ${table}`);

      // Get data
      const { rows } = await client.query(`SELECT * FROM "${table}"`);

      if (rows.length > 0) {
        stream.write(`-- Table: ${table} (${rows.length} rows)\n`);

        for (const row of rows) {
          const keys = Object.keys(row).map(k => `"${k}"`).join(', ');
          const values = Object.values(row).map(val => formatValue(val)).join(', ');
          stream.write(`INSERT OR IGNORE INTO "${table}" (${keys}) VALUES (${values});\n`);
        }
        stream.write('\n');
      } else {
        console.log(`  -> Empty table, skipping rows.`);
      }
    }

    // stream.write('COMMIT;\n');
    stream.write('PRAGMA foreign_keys = ON;\n');
    stream.end();

    console.log('Dump completed successfully!');

  } catch (err) {
    console.error('Error during dump:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function formatValue(val) {
  if (val === null || val === undefined) return 'NULL';

  if (typeof val === 'number') return val;

  if (typeof val === 'boolean') return val ? 1 : 0;

  if (val instanceof Date) return `'${val.toISOString()}'`;

  if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;

  // Handle Array or Object (JSON)
  if (typeof val === 'object') {
    // If it has a custom toString that isn't Object's, use it? No, assume JSON.
    // pg might return arrays as Array.
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }

  // Strings (including BigInts returned as strings by pg)
  return `'${String(val).replace(/'/g, "''")}'`;
}

dump();
