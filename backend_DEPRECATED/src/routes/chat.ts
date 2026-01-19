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
            const senderName = user!.full_name || "Usuário";
            const avatarUrl = `https://cardapyia.com/api/media/avatar/${senderId}`;

            let title = TEMPLATES.NEW_MESSAGE(senderName).title;
            let body = TEMPLATES.NEW_MESSAGE(senderName).body;
            let notificationType = "new_message";
            let payload: any = { service_id: req.params.serviceId };

            // Custom Notification for Schedule Proposal
            if (type === 'schedule_proposal') {
              try {
                const proposalData = JSON.parse(content);
                const date = new Date(proposalData.date);
                // Format: DD/MM HH:mm (Simple formatter since we don't have heavy libs)
                const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

                title = "📅 Atualização de Agendamento";
                body = `Prestador ${senderName} propôs agendamento para ${dateStr} às ${timeStr}. Toque para confirmar.`;
                notificationType = "schedule_proposal"; // Custom type for mobile handling
                payload = {
                  ...payload,
                  proposal_date: proposalData.date,
                  click_action: 'FLUTTER_NOTIFICATION_CLICK'
                };
              } catch (e) {
                logger.error("chat.notification.parse", e);
              }
            }

            await notificationManager.send(
              recipientId,
              notificationType,
              req.params.serviceId,
              title,
              body,
              payload,
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
