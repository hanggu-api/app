import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar .env do diretório ai_service que contém o DATABASE_URL
dotenv.config({ path: path.join(process.cwd(), 'ai_service', '.env') });

const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260223040000_ai_vector_search.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('🚀 Conectando ao banco de dados Supabase...');
        await client.connect();
        console.log('✅ Conectado. Executando migração...');
        await client.query(sql);
        console.log('🎉 Migração aplicada com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao aplicar migração:', err);
    } finally {
        await client.end();
    }
}

run();
