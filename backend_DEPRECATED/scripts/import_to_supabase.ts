
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hctrzaunbiokiecizkgi.supabase.co';
// We need the SERVICE_ROLE_KEY to bypass RLS and write to tables
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    try {
        console.log('🚀 Starting Data Import to Supabase...');

        // 1. Locate Backup File
        const backupDir = path.join(__dirname, '../backup');
        const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_') && f.endsWith('.json'));
        if (files.length === 0) {
            throw new Error('No backup file found in backend/backup/');
        }
        // Get latest
        const latestFile = files.sort().reverse()[0];
        const backupPath = path.join(backupDir, latestFile);
        console.log(`📦 Loading backup: ${latestFile}`);

        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        // 2. Import Order (to respect Foreign Keys)
        const tableOrder = [
            'users',
            'providers',
            'categories',
            'professions',
            'provider_professions',
            'provider_locations',
            'provider_schedules',
            'task_catalog',
            'service_categories',
            'service_requests',
            'service_tasks',
            'service_media',
            'reviews',
            'chat_messages',
            'transactions',
            'notifications',
            'user_devices',
            'system_settings'
        ];

        for (const table of tableOrder) {
            if (!data[table] || data[table].length === 0) {
                console.log(`⚠️  Skipping ${table} (No data)`);
                continue;
            }

            console.log(`➡️  Importing ${data[table].length} records into [${table}]...`);

            // Chunking to avoid request limits
            const chunkSize = 100;
            for (let i = 0; i < data[table].length; i += chunkSize) {
                const chunk = data[table].slice(i, i + chunkSize);

                // Fix Incompatible Data Types if needed
                const cleanedChunk = chunk.map((row: any) => {
                    // Remove MySQL specific keys if any?
                    // Example: Convert 0/1 to boolean for specific columns?
                    // Supabase (Postgres) handles 0/1 as boolean usually well, but let's be safe if needed.
                    return row;
                });

                const { error } = await supabase.from(table).upsert(cleanedChunk);
                if (error) {
                    console.error(`❌ Error importing batch to ${table}:`, error);
                }
            }
        }

        console.log('✅ Data Import Completed!');

    } catch (e) {
        console.error('❌ Import Failed:', e);
    } finally {
        process.exit(0);
    }
})();
