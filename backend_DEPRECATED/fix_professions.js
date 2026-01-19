
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fixing profession service types...');

    const updates = [
        { term: 'Barbeiro', type: 'at_provider' },
        { term: 'Cabeleireiro', type: 'at_provider' },
        { term: 'Manicure', type: 'at_provider' },
        { term: 'Pedicure', type: 'at_provider' },
        { term: 'Maquiadora', type: 'at_provider' },
        { term: 'Esteticista', type: 'at_provider' },
        { term: 'Dentista', type: 'at_provider' },
        { term: 'Médic', type: 'at_provider' },
        { term: 'Terapeuta', type: 'at_provider' },
        { term: 'Psicólog', type: 'at_provider' },
        { term: 'Nutri', type: 'at_provider' },
        { term: 'Fisiot', type: 'at_provider' },
        { term: 'Pilates', type: 'at_provider' },
    ];

    for (const up of updates) {
        // Note: We use raw query or try catch just in case, but Prisma updateMany should work if type matches schema.
        const result = await prisma.professions.updateMany({
            where: {
                name: {
                    contains: up.term
                }
            },
            data: {
                service_type: up.type
            }
        });
        console.log(`Updated ${result.count} professions for term '${up.term}' to '${up.type}'`);
    }

    // Exact matches
    await prisma.professions.updateMany({
        where: { name: 'Barbeiro' },
        data: { service_type: 'at_provider' }
    });

    await prisma.professions.updateMany({
        where: { name: 'Cabeleireira' },
        data: { service_type: 'at_provider' }
    });

    console.log('Done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
