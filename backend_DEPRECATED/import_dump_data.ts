import fs from 'fs';
import path from 'path';
import prisma from './src/database/prisma';

async function importAllDump() {
    const services = JSON.parse(fs.readFileSync(path.join(__dirname, 'services_data.json'), 'utf8'));

    console.log('🚀 Syncing Providers Info...');
    const providerUpdates = [
        { id: 832, commercial_name: 'barba ruiva', bio: 'Barbeiro Profissional em Imperatriz', address: 'Rua Antonio Nunes, 9 - Centro, Imperatriz - MA' },
        { id: 833, commercial_name: 'cabelo', bio: 'Corte Unissex e Barba', address: 'Rua Tocantins, 30 - Parque das Palmeiras, Imperatriz - MA' },
        { id: 849, commercial_name: 'Lucas cabelira', address: 'Imperatriz - MA' },
        { id: 873, commercial_name: 'stjwtnqf', address: 'Rua João Walcacer de Oliveira, 16 - Parque das Palmeiras, Imperatriz - MA' },
        { id: 878, commercial_name: 'Ana Manicure & Nail Art', bio: 'Especialista em unhas e cuidados femininos' }
    ];

    for (const p of providerUpdates) {
        try {
            await prisma.providers.upsert({
                where: { user_id: BigInt(p.id) },
                update: {
                    commercial_name: p.commercial_name,
                    bio: p.bio,
                    address: p.address,
                    is_online: true
                },
                create: {
                    user_id: BigInt(p.id),
                    commercial_name: p.commercial_name,
                    bio: p.bio,
                    address: p.address,
                    is_online: true
                }
            });
            console.log(`✅ Provider ${p.id} synced.`);
        } catch (e: any) {
            console.error(`❌ Error syncing provider ${p.id}:`, e.message);
        }
    }

    console.log('\n🚀 Syncing Custom Services...');
    for (const s of services) {
        try {
            await prisma.provider_custom_services.upsert({
                where: { id: s.id },
                update: {
                    provider_id: BigInt(s.provider_id),
                    name: s.name,
                    duration: s.duration,
                    price: s.price,
                    active: true
                },
                create: {
                    id: s.id,
                    provider_id: BigInt(s.provider_id),
                    name: s.name,
                    duration: s.duration,
                    price: s.price,
                    active: true
                }
            });
        } catch (e: any) {
            console.error(`❌ Error syncing service ${s.id}:`, e.message);
        }
    }
    console.log(`✅ ${services.length} services processed.`);

    console.log('\n--- Sync Complete ---');
    process.exit(0);
}

importAllDump().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
