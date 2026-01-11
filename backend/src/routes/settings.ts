import { Router, Request, Response } from "express";
import pool from "../database/db";
import logger from "../utils/logger";

const router = Router();

/**
 * GET /api/settings/theme
 * Retrieves the theme configuration from system_settings.
 */
router.get("/theme", async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT value FROM system_settings WHERE key_name = 'theme_config'"
    );

    if (rows.length > 0) {
      // Return the JSON value directly
      res.json({ success: true, data: rows[0].value });
    } else {
      // Fallback if not configured
      res.json({
        success: true,
        data: {
          client: {
            primary: "#FFE600",
            secondary: "#EF6C00",
            background: "#FFE600",
            text_primary: "#2E5C99"
          },
          provider: {
            primary: "#4CAF50",
            secondary: "#2E7D32",
            background: "#E8F5E9",
            text_primary: "#1B5E20"
          }
        }
      });
    }
  } catch (error) {
    logger.error("settings.get_theme", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
