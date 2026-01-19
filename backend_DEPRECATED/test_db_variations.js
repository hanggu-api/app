const { Client } = require('pg');

const projectRef = 'hctrzaunbiokiecizkgi';
const pass_encoded = 'Monica100%40irisMAR100%40';

const regions = [
    'aws-0-sa-east-1',
    'aws-0-us-east-1',
    'aws-0-us-west-1',
    'aws-0-eu-central-1',
    'aws-0-ca-central-1'
];

async function testAll() {
    for (const region of regions) {
        const poolerHost = `${region}.pooler.supabase.com`;
        console.log(`\n🌍 Testing Region: ${region} (${poolerHost})...`);

        const url = `postgresql://postgres.${projectRef}:${pass_encoded}@${poolerHost}:6543/postgres?pgbouncer=true`;

        const client = new Client({
            connectionString: url,
            connectionTimeoutMillis: 5000,
            ssl: { rejectUnauthorized: false }
        });
        try {
            await client.connect();
            const res = await client.query('SELECT 1 as connected');
            console.log('✅ SUCCESS!', res.rows);
            await client.end();
            return; // Found it!
        } catch (e) {
            console.error('❌ FAILED:', e.message);
        }
    }
}

testAll();
