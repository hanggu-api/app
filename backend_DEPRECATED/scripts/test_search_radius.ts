
import pool from '../src/database/db';
import { UserRepository } from '../src/repositories/userRepository';

(async () => {
    try {
        const repo = new UserRepository();
        const lat = -23.550520;
        const lon = -46.633308;

        console.log('🌍 Testing Radius Search from São Paulo (Lat: -23.55, Lon: -46.63)...');
        console.log('   Expected: Providers sorted by distance (ASC)');

        const providers = await repo.searchProviders('', lat, lon);

        console.log(`\nFound ${providers.length} providers.`);
        console.table(providers.map(p => ({
            id: p.id,
            name: p.commercial_name || p.full_name,
            dist_km: p.distance_km
        })));

        // Verification
        let sorted = true;
        for (let i = 0; i < providers.length - 1; i++) {
            const d1 = providers[i].distance_km;
            const d2 = providers[i + 1].distance_km;
            if (d1 > d2) {
                sorted = false;
                console.error(`❌ Sorting Error: Provider ${providers[i].id} (${d1}km) is after ${providers[i + 1].id} (${d2}km)`);
            }
        }

        if (sorted) {
            console.log('✅ Success: Results are correctly sorted by distance.');
        } else {
            console.log('❌ Failure: Results are NOT sorted correctly.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
