
import pool from '../database/db';

async function forceLocation() {
    try {
        const providerId = 835;
        const lat = -23.550520;
        const lng = -46.633308;

        console.log(`Forcing location for provider ${providerId}...`);

        // Update provider_locations
        await pool.query(
            `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()`,
            [providerId, lat, lng]
        );
        console.log('Updated provider_locations');

        // Update providers table (fallback)
        await pool.query(
            `UPDATE providers SET latitude = ?, longitude = ? WHERE user_id = ?`,
            [lat, lng, providerId]
        );
        console.log('Updated providers table');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

forceLocation();
