import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../database/prisma";
import logger from "../utils/logger";
import { notificationManager } from "../notifications/manager";
import { NotificationService } from "../services/NotificationService";

const router = Router();

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios", "web"]).optional().default("web"),
});

const registerTokenHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { token, platform } = tokenSchema.parse(req.body);

    await prisma.user_devices.deleteMany({
      where: { token, user_id: { not: BigInt(user.id) } }
    });

    const existing = await prisma.user_devices.findFirst({
      where: { token, user_id: BigInt(user.id) }
    });

    if (existing) {
      await prisma.user_devices.update({
        where: { id: existing.id },
        data: { last_active: new Date(), platform }
      });
    } else {
      await prisma.user_devices.create({
        data: {
          user_id: BigInt(user.id),
          token,
          platform,
          last_active: new Date()
        }
      });
    }

    res.json({ success: true, message: "Device token registered" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("notifications.token", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
};

router.post("/token", authMiddleware, registerTokenHandler);
router.post("/register-token", authMiddleware, registerTokenHandler);

router.post("/test", async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;
    await notificationManager.send(
      userId,
      "test_notification",
      "test_id",
      title || "Test Notification",
      body || "This is a test notification",
      { test: true }
    );
    res.json({ success: true, message: "Notification sent" });
  } catch (error) {
    logger.error("notifications.test", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/token", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    await prisma.user_devices.deleteMany({
      where: { user_id: BigInt(user.id), token }
    });

    res.json({ success: true, message: "Device token removed" });
  } catch (error) {
    logger.error("notifications.token.delete", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await NotificationService.getUserNotifications(Number(user.id), page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("notifications.list", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:id/read", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const id = Number(req.params.id);
    await NotificationService.markAsRead(id, Number(user.id));
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    logger.error("notifications.read", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/read-all", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    await NotificationService.markAllAsRead(Number(user.id));
    res.json({ success: true, message: "All marked as read" });
  } catch (error) {
    logger.error("notifications.read_all", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/send", async (req: Request, res: Response) => {
  try {
    const { userId, templateId, data } = req.body;
    if (!userId || !templateId) {
      res.status(400).json({ success: false, message: "Missing userId or templateId" });
      return;
    }

    const log = await NotificationService.sendToUser(userId, templateId, data);
    res.json({ success: true, log });
  } catch (error) {
    logger.error("notifications.send", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
