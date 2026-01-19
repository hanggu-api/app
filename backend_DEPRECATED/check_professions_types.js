const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const professions = await prisma.professions.findMany();

    console.log('--- ALL PROFESSIONS AND SERVICE TYPES ---');
    professions.forEach(p => {
        console.log(`ID: ${p.id} | Name: ${p.name} | Service Type: ${p.service_type}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
