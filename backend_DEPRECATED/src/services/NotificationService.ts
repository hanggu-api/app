import prisma from "../database/prisma";
import { notificationManager } from "../notifications/manager";

export class NotificationService {
    /**
     * Send a notification to a user using a template.
     */
    static async sendToUser(
        userId: number,
        templateId: string,
        data: Record<string, string> = {}
    ) {
        try {
            // 1. Fetch template
            // @ts-ignore - Prisma types might not be generated yet
            const template = await prisma.notification_templates.findUnique({
                where: { id: templateId }
            });

            if (!template) {
                console.warn(`[NotificationService] Template ${templateId} not found`);
                // Fallback or return? Let's return for now.
                return null;
            }

            // 2. Render content
            let title = template.title;
            let body = template.body;

            // Default variable replacement {{key}}
            Object.entries(data).forEach(([key, value]) => {
                title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
                body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });

            // 3. Log to DB
            // @ts-ignore
            const log = await prisma.notification_logs.create({
                data: {
                    user_id: BigInt(userId),
                    user_type: 'user', // Default, logic to determine type could make this dynamic
                    template_id: templateId,
                    title,
                    body,
                    data: data,
                    is_read: false
                }
            });

            // 4. Send Push (Async)
            // We use the ID from the log as the notification ID reference
            notificationManager.send(
                userId,
                template.type,
                String(log.id),
                title,
                body,
                data
            );

            return log;
        } catch (error) {
            console.error("[NotificationService] Error sending notification:", error);
            throw error;
        }
    }

    /**
     * Get notifications for a user.
     */
    static async getUserNotifications(userId: number, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        // @ts-ignore
        const logs = await prisma.notification_logs.findMany({
            where: { user_id: BigInt(userId) },
            orderBy: { sent_at: 'desc' },
            skip,
            take: limit,
            include: {
                templates: {
                    select: { type: true }
                }
            }
        });

        // Check for unread count
        // @ts-ignore
        const unreadCount = await prisma.notification_logs.count({
            where: { user_id: BigInt(userId), is_read: false }
        });

        return {
            data: logs.map((l: any) => ({
                ...l,
                id: Number(l.id),
                user_id: Number(l.user_id),
                type: l.templates?.type || 'system',
                data: l.data || {}
            })),
            unreadCount
        };
    }

    /**
     * Mark as read
     */
    static async markAsRead(id: number, userId: number) {
        // @ts-ignore
        await prisma.notification_logs.updateMany({
            where: { id: id, user_id: BigInt(userId) },
            data: { is_read: true, read_at: new Date() }
        });
    }

    /**
     * Mark all as read for user
     */
    static async markAllAsRead(userId: number) {
        // @ts-ignore
        await prisma.notification_logs.updateMany({
            where: { user_id: BigInt(userId), is_read: false },
            data: { is_read: true, read_at: new Date() }
        });
    }
}
