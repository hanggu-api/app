import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.audit_logs.findMany({
        orderBy: { created_at: 'desc' },
        take: 10
    });

    console.log('--- Logs de Auditoria ---');
    logs.forEach(l => {
        console.log(`Time: ${l.created_at}`);
        console.log(`Action: ${l.action}`);
        console.log(`User ID: ${l.user_id}`);
        console.log(`Entity ID: ${l.entity_id}`);
        console.log(`Details: ${JSON.stringify(l.details)}`);
        console.log('---------------------------');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
