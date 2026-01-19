import { FirebaseService } from './firebase_service';
import prisma from '../database/prisma';
import logger from '../utils/logger';

/**
 * DataSyncService: Centralizes synchronization between SQL (Supabase) and NoSQL (Firebase).
 * This ensures consistency across the platform.
 */
export const DataSyncService = {
    /**
     * Syncs a service request's current state to Firestore.
     * This is the "Gold Source" for real-time UI updates on the mobile app.
     */
    syncServiceToFirestore: async (serviceId: string) => {
        try {
            // 1. Fetch full service data from Supabase
            const service = await prisma.service_requests.findUnique({
                where: { id: serviceId },
                include: {
                    users: { select: { full_name: true, avatar_url: true } },
                    providers: {
                        include: {
                            users: { select: { full_name: true, avatar_url: true } }
                        }
                    },
                    service_categories: true,
                    reviews: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            if (!service) {
                logger.warn(`[DataSync] Service ${serviceId} not found in Supabase. Skipping sync.`);
                return;
            }

            // 2. Prepare payload for Firestore
            const firestorePayload: any = {
                id: service.id,
                status: service.status,
                client_id: String(service.client_id),
                client_name: service.users?.full_name || null,
                client_avatar: service.users?.avatar_url || null,
                provider_id: service.provider_id ? String(service.provider_id) : null,
                provider_name: service.providers?.users?.full_name || null,
                provider_avatar: service.providers?.users?.avatar_url || null,
                provider_rating: Number(service.providers?.rating_avg || 0),
                provider_rating_count: service.providers?.rating_count || 0,
                category_id: service.category_id,
                category_name: service.service_categories?.name || null,
                category_icon: service.service_categories?.icon_slug || null,
                profession: service.profession || null,
                price_estimated: Number(service.price_estimated || 0),
                price_upfront: Number(service.price_upfront || 0),
                address: service.address || null,
                latitude: Number(service.latitude || 0),
                longitude: Number(service.longitude || 0),
                scheduled_at: service.scheduled_at?.toISOString() || null,
                location_type: service.location_type || 'client',
                arrived_at: service.arrived_at?.toISOString() || null,
                payment_remaining_status: service.payment_remaining_status || 'pending',
                completion_code: service.completion_code || null,
                reviews: service.reviews.map(r => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
                    created_at: r.created_at?.toISOString()
                })),
                updated_at: new Date().toISOString()
            };

            // Remove undefined values (Firestore doesn't accept them)
            Object.keys(firestorePayload).forEach(key => {
                if (firestorePayload[key] === undefined) {
                    delete firestorePayload[key];
                }
            });

            // 3. Update Firestore
            await FirebaseService.updateServiceStatus(serviceId, firestorePayload);

            logger.info(`[DataSync] Successfully synced service ${serviceId} to Firestore.`);
        } catch (error) {
            logger.error(`[DataSync] Failed to sync service ${serviceId}:`, error);
        }
    },

    /**
     * Syncs a chat message from Supabase to Firestore.
     */
    syncChatMessageToFirestore: async (serviceId: string, messageId: number | bigint) => {
        try {
            const message = await prisma.chat_messages.findUnique({
                where: { id: BigInt(messageId) }
            });

            if (!message) return;

            // Update Firestore for real-time delivery
            await FirebaseService.sendChatMessage(serviceId, {
                id: String(message.id),
                content: message.content,
                sender_id: String(message.sender_id),
                type: message.type || 'text',
                created_at: new Date().toISOString()
            });

            logger.info(`[DataSync] Synced message ${messageId} for service ${serviceId} to Firestore.`);
        } catch (error) {
            logger.error(`[DataSync] Chat sync failed for service ${serviceId}:`, error);
        }
    },

    /**
     * Syncs user presence/profile changes if needed (Extension point)
     */
    syncUserToFirestore: async (userId: number | bigint) => {
        // Placeholder for future profile sync needs
        logger.debug(`[DataSync] User sync requested for ${userId}`);
    }
};
