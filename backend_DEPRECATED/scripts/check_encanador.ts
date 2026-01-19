
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    try {
        console.log('--- Checking for Encanador ---');
        const match = await prisma.professions.findFirst({
            where: { name: { contains: 'Encanador' } }
        });
        console.log('Match:', match);

        console.log('--- Listing Top 10 Professions ---');
        const all = await prisma.professions.findMany({ take: 10 });
        console.log(all.map(p => `${p.id}: ${p.name} (Cat: ${p.category_id})`));

        console.log('--- Listing Tasks for Encanador ---');
        if (match) {
            const tasks = await prisma.task_catalog.findMany({
                where: { profession_id: match.id }
            });
            console.log(tasks.map(t => `${t.id}: ${t.name}`));
        } else {
            console.log('Encanador not found, checking nearby terms...');
            const nearby = await prisma.professions.findMany({
                where: {
                    OR: [
                        { name: { contains: 'Hidráulica' } },
                        { name: { contains: 'Bombeiro' } }
                    ]
                }
            });
            console.log('Nearby:', nearby);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
