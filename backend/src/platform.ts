import dotenv from "dotenv";
import { FirebaseService } from "./services/firebase_service";

dotenv.config();

// Firebase Adapter replacing Socket.IO
export const io: any = {
    emit: (event: string, payload: any) => {
        // Global emit not supported in this adapter
        // console.log(`[FirebaseAdapter] Global emit ignored: ${event}`);
    },
    to: (room: string) => ({
        emit: (event: string, payload: any) => {
            handleFirebaseRedirect(room, event, payload);
        }
    }),
    in: (room: string) => ({
        emit: (event: string, payload: any) => {
            handleFirebaseRedirect(room, event, payload);
        }
    })
};

function handleFirebaseRedirect(room: string, event: string, payload: any) {
    try {
        if (room.startsWith('service:')) {
            const serviceId = room.split(':')[1];
            if (event === 'chat.message') {
                FirebaseService.sendChatMessage(serviceId, payload);
            } else {
                // Capture ALL service events (status, updated, accepted, completed, edit_request, etc.)
                const data = (payload && payload.service) ? payload.service : payload;

                // Normalize data for Firestore
                let updateData = typeof data === 'object' && data !== null ? { ...data } : { value: data };
                updateData.last_event = event;
                updateData.updated_at = new Date().toISOString();

                FirebaseService.updateServiceStatus(serviceId, updateData);
            }
        } else if (room.startsWith('user:')) {
            const userId = room.split(':')[1];
            console.log(`[FirebaseAdapter] Redirecting event ${event} to RTDB events/${userId}`);
            FirebaseService.sendUserEvent(userId, event, payload);
        }
    } catch (e) {
        console.error('[FirebaseAdapter] Error processing event:', e);
    }
}

export function setIO(instance: any) {
    // Ignored
    console.log('[platform] setIO ignored - Using Firebase Adapter');
}

// Redis removed in favor of MySQL GeoSpatial + In-Memory Presence
export const redis: any = {
    status: "disabled",
    get: async () => null,
    set: async () => "OK",
    sadd: async () => 0,
    srem: async () => 0,
    del: async () => 0,
    geoadd: async () => 0,
    geosearch: async () => [],
    quit: async () => "OK",
    disconnect: async () => "OK",
    on: () => { },
    connect: async () => { },
};
