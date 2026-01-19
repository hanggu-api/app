const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const providers = await prisma.users.findMany({
        where: {
            provider_professions: {
                some: {}
            }
        },
        include: {
            providers: true,
            provider_professions: {
                include: {
                    professions: true
                }
            }
        }
    });

    console.log('--- USERS WITH PROVIDER PROFESSIONS ---');
    providers.forEach(u => {
        const p = u.providers;
        const profs = u.provider_professions.map(pp => pp.professions.name).join(', ');
        const isBeauty = profs.toLowerCase().includes('barbeiro') || profs.toLowerCase().includes('cabel');
        if (isBeauty) {
            console.log(`ID: ${u.id} | Name: ${p?.commercial_name || u.full_name} | Role: ${u.role} | Professions: [${profs}]`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
