
import pool from '../database/db';

async function checkLocations() {
    try {
        const providerId = 835;
        const [locs]: any = await pool.query('SELECT * FROM provider_locations WHERE provider_id = ?', [providerId]);
        console.log('Provider Locations:', locs);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkLocations();
