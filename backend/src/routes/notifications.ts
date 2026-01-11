import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import pool from "../database/db";
import logger from "../utils/logger";
import { notificationManager } from "../notifications/manager";

const router = Router();

const tokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios", "web"]).optional().default("web"),
});

// Register Device Token
const registerTokenHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { token, platform } = tokenSchema.parse(req.body);

    // Insert or Update Token (upsert behavior via ON DUPLICATE KEY UPDATE logic if using INSERT IGNORE or REPLACE, but unique key is (user_id, token))
    // The unique key is `idx_user_token` (`user_id`, `token`).
    // If we want to update `last_active` on duplicate, we can use INSERT ... ON DUPLICATE KEY UPDATE

    await pool.query(
      `
            INSERT INTO user_devices (user_id, token, platform, last_active)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                last_active = NOW(),
                platform = VALUES(platform)
        `,
      [user.id, token, platform],
    );

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

// Remove Device Token (Logout)
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
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { token } = req.body;
    if (!token) {
      // Optional: remove all devices for this user? No, usually just the current one.
      // If no token provided, maybe just return success or error.
      // For now require token.
      res.status(400).json({ success: false, message: "Token required" });
      return;
    }

    await pool.query(
      "DELETE FROM user_devices WHERE user_id = ? AND token = ?",
      [user.id, token],
    );

    res.json({ success: true, message: "Device token removed" });
  } catch (error) {
    logger.error("notifications.token.delete", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
