
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const realProviders = await prisma.users.findMany({
        where: {
            role: 'provider',
            providers: { commercial_name: { not: null } }
        },
        include: {
            providers: true,
            provider_locations: true
        }
    });
    console.log('Real Providers Locations:');
    realProviders.forEach(u => {
        const loc = u.provider_locations[0];
        console.log(`ID: ${u.id}, Commercial: ${u.providers?.commercial_name}, Lat: ${loc?.latitude}, Lon: ${loc?.longitude}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
