
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.professions.findFirst({
        where: { name: 'Barbeiro' }
    });
    console.log('Barbeiro:', p);
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
