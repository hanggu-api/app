import { Router, Request, Response } from "express";
import { ChatRepository } from "../repositories/chatRepository";
import { ServiceRepository } from "../repositories/serviceRepository";
import { notificationManager, TEMPLATES } from "../notifications/manager";
import logger from "../utils/logger";
import { io } from "../platform";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const chatRepo = new ChatRepository();
const serviceRepo = new ServiceRepository();

// Get Messages for a Service
router.get(
  "/:serviceId/messages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const messages = await chatRepo.getMessages(req.params.serviceId);
      res.json({ success: true, messages });
    } catch (error) {
      logger.error("chat.get", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Send Message
router.post(
  "/:serviceId/messages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { content, type } = req.body;
      const user = (req as AuthRequest).user;

      const messageId = await chatRepo.sendMessage({
        service_id: req.params.serviceId,
        sender_id: user!.id!,
        content,
        type,
      });
      io.to(`service:${req.params.serviceId}`).emit("chat.message", {
        id: messageId,
        service_id: req.params.serviceId,
        sender_id: user!.id!,
        content,
        type,
        created_at: new Date().toISOString(),
      });
      logger.service("chat.message", {
        id: messageId,
        service_id: req.params.serviceId,
        sender_id: user!.id,
      });

      // Send Notification
      (async () => {
        const service = await serviceRepo.findById(req.params.serviceId);
        if (service) {
          const senderId = user!.id!;
          const recipientId =
            senderId === Number(service.client_id)
              ? Number(service.provider_id)
              : Number(service.client_id);

          if (recipientId) {
            // Fetch sender name if possible, but for now we use generic 'Usuário' or we could fetch it.
            // Actually, we have user object here.
            const senderName = user!.full_name || "Usuário";
            const tmplWithName = TEMPLATES.NEW_MESSAGE(senderName);

            const avatarUrl = `https://cardapyia.com/api/media/avatar/${senderId}`;

            await notificationManager.send(
              recipientId,
              "new_message",
              req.params.serviceId,
              tmplWithName.title,
              tmplWithName.body,
              { service_id: req.params.serviceId },
              avatarUrl,
            );
          }
        }
      })().catch((err) => logger.error("notification.chat", err));

      res.status(201).json({ success: true, id: messageId });
    } catch (error) {
      logger.error("chat.post", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

export default router;
