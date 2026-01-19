import * as admin from 'firebase-admin';
import { serviceRepository } from '../repositories/serviceRepository'; // Singleton instance
import { notificationManager, TEMPLATES } from '../notifications/manager';
import logger from '../utils/logger';

class ChatListener {
    private unsubscribe: (() => void) | null = null;
    private isProcessing: boolean = false;

    public start() {
        if (this.unsubscribe) {
            console.log('⚠️ ChatListener already running.');
            return;
        }

        console.log('🎧 Starting Firestore Chat Listener (collectionGroup: messages)...');

        // Listen to all 'messages' subcollections across 'services'
        // We only care about NEW messages.
        // Ideally, we should persist a 'lastProcessedTimestamp' to avoid re-processing on restart,
        // but for now, we start listening from NOW.
        const now = admin.firestore.Timestamp.now();

        this.unsubscribe = admin.firestore()
            .collectionGroup('messages')
            .where('created_at', '>', now)
            .onSnapshot(
                (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            this.handleNewMessage(change.doc);
                        }
                    });
                },
                (error) => {
                    logger.error('ChatListener Error:', error);
                }
            );
    }

    public stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('🛑 ChatListener stopped.');
        }
    }

    private async handleNewMessage(doc: admin.firestore.QueryDocumentSnapshot) {
        try {
            const data = doc.data();
            const messageId = doc.id;

            // Determine Service ID from document path: services/{serviceId}/messages/{messageId}
            // doc.ref.parent.parent?.id should correspond to serviceId
            const serviceId = doc.ref.parent.parent?.id;

            if (!serviceId) {
                // Fallback: check if data has service_id (it should based on legacy, but implementation plan puts it in path)
                logger.warn(`ChatListener: Could not determine serviceId for message ${messageId}`);
                return;
            }

            const senderId = data.sender_id;
            if (!senderId) {
                // System message or malformed
                return;
            }

            // Avoid processing if we just sent it (though listener is usually for other parties)
            // Actually, we want to notify the RECIPIENT.

            logger.info(`📨 New Firestore Message detected in ${serviceId} from ${senderId}`);

            // Fetch Service to find Recipient
            const service = await serviceRepository.findById(serviceId);
            if (!service) {
                logger.warn(`ChatListener: Service ${serviceId} not found in SQL.`);
                return;
            }

            // Determine recipient
            // Note: service.client_id/provider_id might be strings or numbers.
            const clientId = Number(service.client_id);
            const providerId = Number(service.provider_id);
            const sId = Number(senderId);

            let recipientId: number | null = null;
            let senderName = 'Usuário';

            if (sId === clientId) {
                recipientId = providerId;
                senderName = 'Cliente';
            } else if (sId === providerId) {
                recipientId = clientId;
                senderName = service.profession || 'Profissional';
            }

            if (recipientId) {
                // Prepare Notification
                const tmpl = TEMPLATES.NEW_MESSAGE(senderName);
                const avatarUrl = `https://cardapyia.com/api/media/avatar/${senderId}`;

                await notificationManager.send(
                    recipientId,
                    "new_message",
                    serviceId,
                    tmpl.title,
                    tmpl.body,
                    {
                        service_id: serviceId,
                        type: 'chat_message',
                        message_id: messageId
                    },
                    avatarUrl
                );
                console.log(`🔔 Notification sent to user ${recipientId}`);
            }

        } catch (error) {
            logger.error(`ChatListener processing error for doc ${doc.id}:`, error);
        }
    }
}

export const chatListener = new ChatListener();
