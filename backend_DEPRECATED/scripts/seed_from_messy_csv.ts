
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const csvPath = 'c:/Users/thela/.gemini/antigravity/scratch/projeto_figma_app/mobile_app/app.csv';

const tableHeaders: Record<string, string> = {
    'ai_embeddings': '"id","profession_id","profession_name","category_id","category_name","text","embedding"',
    'payments': '"id","mission_id","proposal_id","user_id","provider_id","amount","currency","status"',
    'professions': '"id","name","category_id","icon","keywords"',
    'providers': '"user_id","bio","address","rating_avg"',
    'task_catalog': '"id","profession_id","name","pricing_type"',
    'categories': '"id","name","icon","slug"',
    'users': '"id","firebase_uid","email"',
};

async function main() {
    const content = fs.readFileSync(csvPath, 'utf8');

    // Find all header positions
    const markers: { table: string, index: number }[] = [];
    for (const [table, header] of Object.entries(tableHeaders)) {
        let idx = content.indexOf(header);
        if (idx !== -1) {
            markers.push({ table, index: idx });
        }
    }

    markers.sort((a, b) => a.index - b.index);
    console.log('Markers found:', markers);

    const tablesData: Record<string, any[]> = {};

    for (let i = 0; i < markers.length; i++) {
        const start = markers[i].index;
        const end = (i + 1 < markers.length) ? markers[i + 1].index : content.length;
        const block = content.substring(start, end);
        const tableName = markers[i].table;

        console.log(`Processing block for ${tableName}...`);

        // Use a simpler approach for splitting rows since csv-parser is stream-based
        // and our blocks are small. Let's just use manual split but with better quote handling.
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const headerLine = lines[0];
        const fields = headerLine.replace(/"/g, '').split(',');

        tablesData[tableName] = [];
        for (let j = 1; j < lines.length; j++) {
            const values = parseCsvLine(lines[j]);
            const row: any = {};
            fields.forEach((f, k) => {
                let val: any = values[k];
                if (val === 'NULL' || val === '' || val === undefined) val = null;
                if (val && val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);

                row[f] = val;
            });
            tablesData[tableName].push(row);
        }
    }

    // CLEANUP
    console.log('Cleaning up...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE payments, task_catalog, provider_professions, providers, professions, service_categories, users CASCADE');

    // IMPORT
    const order = ['categories', 'professions', 'users', 'providers', 'task_catalog', 'payments', 'ai_embeddings'];
    for (const table of order) {
        const data = tablesData[table];
        if (!data) continue;
        console.log(`Importing ${data.length} rows into ${table}...`);
        for (let row of data) {
            try {
                // Formatting
                if (row.id) row.id = Number(row.id);
                if (row.user_id) row.user_id = BigInt(row.user_id);
                if (row.id && table === 'users') row.id = BigInt(row.id);
                if (row.amount) row.amount = Number(row.amount);
                if (row.unit_price) row.unit_price = Number(row.unit_price);
                if (row.created_at && row.created_at.includes('-')) row.created_at = new Date(row.created_at.replace(' ', 'T') + '.000Z');
                if (row.active !== undefined) row.active = row.active === '1' || row.active === 'true';

                if (table === 'users') {
                    // Ensure required fields
                    if (!row.email) continue;
                    await prisma.users.create({
                        data: {
                            id: row.id,
                            email: row.email,
                            password_hash: row.password_hash || '',
                            full_name: row.full_name || row.email,
                            role: row.role || 'client',
                            firebase_uid: row.firebase_uid,
                            created_at: row.created_at || new Date()
                        }
                    });
                } else if (table === 'categories') {
                    await prisma.service_categories.create({ data: { id: row.id, name: row.name, icon_slug: row.icon } });
                } else if (table === 'professions') {
                    await prisma.professions.create({
                        data: {
                            id: row.id,
                            name: row.name,
                            category_id: Number(row.category_id) || null,
                            icon: row.icon,
                            keywords: row.keywords || '',
                            service_type: row.service_type || 'on_site'
                        }
                    });
                } else if (table === 'providers') {
                    await prisma.providers.create({
                        data: {
                            user_id: row.user_id,
                            bio: row.bio,
                            address: row.address,
                            commercial_name: row.commercial_name
                        }
                    });
                } else if (table === 'task_catalog') {
                    await prisma.task_catalog.create({
                        data: {
                            id: row.id,
                            profession_id: Number(row.profession_id),
                            name: row.name,
                            unit_price: Number(row.unit_price) || 0,
                            pricing_type: row.pricing_type || 'fixed'
                        }
                    });
                }
            } catch (e: any) {
                // console.log(`Error in ${table}: ${e.message}`);
            }
        }
    }

    console.log('Seed done!');
}

function parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

main().catch(console.error).finally(() => prisma.$disconnect());
