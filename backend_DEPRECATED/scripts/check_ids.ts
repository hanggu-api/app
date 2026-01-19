
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    try {
        console.log('--- Checking IDs ---');
        const p1 = await prisma.professions.findUnique({ where: { id: 4284 } });
        console.log('Profession 4284:', p1);

        const p2 = await prisma.professions.findUnique({ where: { id: 4283 } });
        console.log('Profession 4283:', p2);

        const p3 = await prisma.professions.findUnique({ where: { id: 3729 } });
        console.log('Profession 3729 (Encanador origin):', p3);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
