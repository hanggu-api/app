import { Router, Request, Response } from "express";
import prisma from "../database/prisma";
import logger from "../utils/logger";

const router = Router();

router.get("/theme", async (req: Request, res: Response) => {
  try {
    const row = await prisma.system_settings.findUnique({
      where: { key_name: 'theme_config' }
    });

    if (row && row.value) {
      res.json({ success: true, data: row.value });
    } else {
      res.json({
        success: true,
        data: {
          client: { primary: "#FFE600", secondary: "#EF6C00", background: "#FFE600", text_primary: "#2E5C99" },
          provider: { primary: "#4CAF50", secondary: "#2E7D32", background: "#E8F5E9", text_primary: "#1B5E20" }
        }
      });
    }
  } catch (error) {
    logger.error("settings.get_theme", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
