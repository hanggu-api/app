
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.users.findMany({
        where: {
            OR: [
                { full_name: { contains: 'Stress' } },
                { providers: { commercial_name: { not: null } } }
            ]
        },
        include: {
            providers: true,
            provider_professions: {
                include: { professions: true }
            },
            provider_locations: true
        },
        take: 20
    });

    console.log('--- Provider Data (Real & Stress) ---');
    users.forEach(u => {
        console.log(`ID: ${u.id}, Name: ${u.full_name}, Commercial: ${u.providers?.commercial_name}`);
        console.log(`  - Location: ${u.provider_locations?.latitude}, ${u.provider_locations?.longitude}`);
        u.provider_professions.forEach(pp => {
            console.log(`    - Prof: ${pp.professions.name}`);
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
