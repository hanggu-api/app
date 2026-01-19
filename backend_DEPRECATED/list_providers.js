
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const providersCount = await prisma.providers.count({
        where: { commercial_name: { not: null } }
    });
    console.log('Providers with Commercial Name:', providersCount);
    const realProviders = await prisma.users.findMany({
        where: {
            role: 'provider',
            providers: { commercial_name: { not: null } }
        },
        include: { providers: true }
    });
    realProviders.forEach(u => {
        console.log(`ID: ${u.id}, Name: ${u.full_name}, Commercial: ${u.providers?.commercial_name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
