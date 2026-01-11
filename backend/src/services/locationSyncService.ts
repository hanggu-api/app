
import admin from '../config/firebase';
import pool from '../database/db';
import logger from '../utils/logger';

export const startLocationSync = () => {
    const db = admin.database();
    const ref = db.ref('locations');

    logger.info('🚀 Starting RTDB -> MySQL Location Sync Service...');

    ref.on('child_changed', async (snapshot) => {
        await syncLocation(snapshot);
    });

    ref.on('child_added', async (snapshot) => {
        await syncLocation(snapshot);
    });
};

const syncLocation = async (snapshot: admin.database.DataSnapshot) => {
    const providerId = snapshot.key; // e.g., "835"
    const data = snapshot.val();

    if (!providerId || !data || !data.latitude || !data.longitude) return;

    try {
        await pool.query(
            `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()`,
            [providerId, data.latitude, data.longitude]
        );
        // logger.debug(`📍 Synced location for provider ${providerId} from RTDB to MySQL`);
    } catch (error) {
        logger.error(`❌ Failed to sync location for provider ${providerId}`, error);
    }
};
