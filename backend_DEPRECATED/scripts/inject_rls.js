const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const migrationsDir = path.join(__dirname, '../prisma/migrations');

// Find the latest migration directory (starts with timestamp)
const migrationDirs = fs.readdirSync(migrationsDir).filter(d => /^\d+/.test(d)).sort();
const latestDir = migrationDirs[migrationDirs.length - 1];
if (!latestDir) {
    console.error('No migration directory found.');
    process.exit(1);
}
const migrationFile = path.join(migrationsDir, latestDir, 'migration.sql');

console.log(`Injecting RLS into: ${migrationFile}`);

const schema = fs.readFileSync(schemaPath, 'utf8');
const lines = schema.split('\n');

const tables = [];
let currentModel = null;
let currentTable = null;

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
    if (modelMatch) {
        currentModel = modelMatch[1];
        currentTable = currentModel; // Default
    }

    if (currentModel) {
        const mapMatch = line.match(/^\s*@@map\("([^"]+)"\)/);
        if (mapMatch) {
            currentTable = mapMatch[1];
        }

        if (line.includes('}')) {
            if (currentTable) tables.push(currentTable);
            currentModel = null;
            currentTable = null;
        }
    }
}

let sql = fs.readFileSync(migrationFile, 'utf8');
sql += '\n\n-- RLS Policies (Injected)\n';

tables.forEach(table => {
    sql += `\nALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`;
    // Add a permissive policy for now to ensure app keeps working during migration
    sql += `\nCREATE POLICY "Enable all access for now" ON "${table}" USING (true) WITH CHECK (true);`;
});

fs.writeFileSync(migrationFile, sql);
console.log(`Injected RLS policies for ${tables.length} tables.`);
