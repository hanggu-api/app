import prisma from './database/prisma';

async function testConnection() {
    console.log('🔌 Testing Backend Database Connection...');
    try {
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('✅ Connected successfully:', result);

        const count = await prisma.professions.count();
        console.log('📊 Total professions in DB:', count);

        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }
}

testConnection();
