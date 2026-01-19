
import pool from '../src/database/db';

(async () => {
    try {
        console.log('🌍 Updating provider locations to São Paulo...');

        const baseLat = -23.550520;
        const baseLon = -46.633308;

        // Update 'providers' table
        const [res]: any = await pool.query(`
      UPDATE providers 
      SET latitude = ?, longitude = ?
      WHERE latitude > -10 
    `, [baseLat, baseLon]);

        console.log(`✅ Updated ${res.changedRows} providers in 'providers' table.`);

        // Update 'provider_locations' table just in case
        const [res2]: any = await pool.query(`
        UPDATE provider_locations
        SET latitude = ?, longitude = ?
        WHERE latitude > -10
    `, [baseLat, baseLon]);

        console.log(`✅ Updated ${res2.changedRows} locations in 'provider_locations' table.`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
