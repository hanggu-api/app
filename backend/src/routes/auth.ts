import { Request, Response, Router } from "express";
import { RowDataPacket } from "mysql2";
import { z } from "zod";
import pool from "../database/db";
import { auditRepo } from "../repositories/auditRepository";
import { UserRepository } from "../repositories/userRepository";
import { emailService } from "../services/emailService";
import { FirebaseService } from "../services/firebase_service";
import logger from "../utils/logger";

const router = Router();
const userRepo = new UserRepository();

// REGISTER Route (Sync with Firebase)
router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      token,
      name,
      email,
      role = "client",
      phone,
      document_type,
      document_value,
      commercial_name,
      address,
      latitude,
      longitude,
      professions,
    } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: "Firebase ID token is required" });
      return;
    }

    const decodedToken = await FirebaseService.verifyIdToken(token);
    if (!decodedToken || decodedToken.email !== email) {
      res.status(401).json({ success: false, message: "Invalid or mismatched token" });
      return;
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, message: "User already exists" });
      return;
    }

    const userId = await userRepo.create({
      email,
      password_hash: "FIREBASE_AUTH",
      full_name: name || decodedToken.name || "User",
      role: role || "client",
      phone: phone || "",
      firebase_uid: decodedToken.uid,
    });

    if (role === "provider") {
      await pool.query(
        "INSERT INTO providers (user_id, commercial_name, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
        [userId, commercial_name || null, address || null, latitude || null, longitude || null]
      );

      // Handle Professions
      if (professions && Array.isArray(professions)) {
        for (const prof of professions) {
          let profId: number | null = null;

          if (typeof prof === 'object' && prof.id) {
            profId = prof.id;
          } else if (typeof prof === 'string') {
            // Find by name
            const [rows] = await pool.query<RowDataPacket[]>(
              "SELECT id FROM professions WHERE name = ? LIMIT 1",
              [prof]
            );
            if (rows.length > 0) {
              profId = rows[0].id;
            }
          }

          if (profId) {
            try {
              await pool.query(
                "INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE profession_id=profession_id",
                [userId, profId]
              );
            } catch (err) {
              logger.error(`Failed to link profession ${profId} to user ${userId}`, err);
            }
          }
        }
      }
    }

    await auditRepo.log({
      user_id: userId,
      action: "register",
      entity_type: "user",
      entity_id: userId,
      details: { role, email },
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    // Send Welcome Email (Async - don't block response)
    emailService.sendWelcomeEmail(email, name || decodedToken.name || "User", role).catch(err => {
      logger.error("Failed to send welcome email", err);
    });

    res.status(201).json({
      success: true,
      user: { id: userId, name: name || decodedToken.name, email, role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("auth.register", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});

// LOGIN/SYNC Route
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, message: "Token required" });
      return;
    }

    const decodedToken = await FirebaseService.verifyIdToken(token);
    if (!decodedToken) {
      await auditRepo.log({
        action: "login_failed",
        details: { reason: "invalid_session" },
        ip_address: req.ip,
        user_agent: req.headers["user-agent"]
      });
      res.status(401).json({ success: false, message: "Invalid session" });
      return;
    }

    const user = await userRepo.findByEmail(decodedToken.email!);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found. Please register.",
        email: decodedToken.email,
        uid: decodedToken.uid,
      });
      return;
    }

    await auditRepo.log({
      user_id: user.id,
      action: "login",
      entity_type: "user",
      entity_id: user.id,
      details: { email: user.email },
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
      // Token is handled on client-side by Firebase SDK
    });
  } catch (error) {
    logger.error("auth.login", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/check", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const phone = req.query.phone as string;
    const document = req.query.document as string;

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? OR phone = ? OR document_value = ?",
      [email || null, phone || null, document || null]
    );

    res.json({ success: true, exists: rows.length > 0 });
  } catch (error) {
    logger.error("auth.check", error);
    res.status(500).json({ success: false, message: "Check failed" });
  }
});

router.get("/professions", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM professions ORDER BY name");
    res.json({ success: true, professions: rows });
  } catch (error) {
    logger.error("auth.professions", error);
    res.status(500).json({ success: false, message: "Failed to fetch professions" });
  }
});

export default router;
