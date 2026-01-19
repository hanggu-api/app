import admin from '../config/firebase';
import prisma from '../database/prisma';
import logger from '../utils/logger';

export const startLocationSync = () => {
    const db = admin.database();
    const ref = db.ref('locations');

    logger.info('🚀 Starting RTDB -> Prisma Location Sync Service...');

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

    // Ignore non-numeric provider IDs
    const id = Number(providerId);
    if (isNaN(id)) {
        return;
    }

    try {
        // --- ADDED: Check if user exists before upserting ---
        const userExists = await prisma.users.findUnique({
            where: { id: BigInt(id) }
        });

        if (!userExists) {
            // logger.warn(`⚠️ Ignoring location sync for non-existent user ${id}`);
            return;
        }

        await prisma.provider_locations.upsert({
            where: { provider_id: BigInt(id) },
            update: {
                latitude: data.latitude,
                longitude: data.longitude,
                updated_at: new Date()
            },
            create: {
                provider_id: BigInt(id),
                latitude: data.latitude,
                longitude: data.longitude,
                updated_at: new Date()
            }
        });
        // logger.debug(`📍 Synced location for provider ${id} from RTDB to Prisma`);
    } catch (error) {
        logger.error(`❌ Failed to sync location for provider ${id}`, error);
    }
};
