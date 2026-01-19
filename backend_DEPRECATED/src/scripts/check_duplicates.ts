import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const services = await prisma.service_requests.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: {
            users: { select: { full_name: true } }
        }
    });

    console.log('--- Ultimos 5 Serviços ---');
    services.forEach(s => {
        console.log(`ID: ${s.id}`);
        console.log(`Cliente: ${s.users?.full_name}`);
        console.log(`Profissão: ${s.profession}`);
        console.log(`Status: ${s.status}`);
        console.log(`Criado em: ${s.created_at}`);
        console.log('---------------------------');
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
