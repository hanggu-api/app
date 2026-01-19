
import pool from '../src/database/db';

(async () => {
    try {
        console.log('🔍 Checking for Barbeiro...');

        // 1. Get Profession ID
        const [profs]: any = await pool.query("SELECT * FROM professions WHERE name LIKE '%Barbeiro%'");
        console.log('Professions found:', profs);

        if (profs.length === 0) {
            console.log('❌ No profession found for Barbeiro');
            process.exit(1);
        }

        const profId = profs[0].id;

        // 2. Get Providers for this profession
        const [providers]: any = await pool.query(`
      SELECT p.user_id, p.commercial_name, u.email, pp.profession_id, p.latitude, p.longitude
      FROM providers p
      JOIN users u ON p.user_id = u.id
      JOIN provider_professions pp ON u.id = pp.provider_user_id
      WHERE pp.profession_id = ?
    `, [profId]);

        console.log(`Found ${providers.length} providers for Barbeiro (ID: ${profId}):`);
        console.table(providers);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
