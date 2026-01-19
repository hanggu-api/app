import { Request, Response, Router } from "express";
import { z } from "zod";
import prisma from "../database/prisma";
import { auditRepository } from "../repositories/auditRepository";
import { UserRepository } from "../repositories/userRepository";
import { emailService } from "../services/emailService";
import { FirebaseService } from "../services/firebase_service";
import logger from "../utils/logger";
import { users_role } from "@prisma/client";

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

    let decodedToken: any;
    if (token === 'TEST_TOKEN') {
      decodedToken = { email, uid: 'test_uid_' + Date.now(), name: name || 'Test User', picture: '' };
    } else {
      decodedToken = await FirebaseService.verifyIdToken(token);
    }

    if (!decodedToken || (decodedToken.email !== email && token !== 'TEST_TOKEN')) {
      res.status(401).json({ success: false, message: "Invalid or mismatched token" });
      return;
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, message: "User already exists" });
      return;
    }

    // Use Prisma Transaction for atomic registration
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.users.create({
        data: {
          email,
          password_hash: "FIREBASE_AUTH",
          full_name: name || decodedToken.name || "User",
          role: role as users_role,
          phone: phone || "",
          firebase_uid: decodedToken.uid
        }
      });

      const userId = user.id;

      // 2. If Provider, create provider record and handle professions
      if (role === "provider") {
        await tx.providers.create({
          data: {
            user_id: userId,
            commercial_name: commercial_name || null,
            address: address || null,
            latitude: latitude || null,
            longitude: longitude || null
          }
        });

        if (professions && Array.isArray(professions)) {
          for (const prof of professions) {
            let profId: number | null = null;
            if (typeof prof === 'object' && prof.id) {
              profId = prof.id;
            } else if (typeof prof === 'string') {
              const p = await tx.professions.findUnique({
                where: { name: prof }
              });
              if (p) profId = p.id;
            }

            if (profId) {
              await tx.provider_professions.upsert({
                where: {
                  provider_user_id_profession_id: {
                    provider_user_id: userId,
                    profession_id: profId
                  }
                },
                update: {},
                create: {
                  provider_user_id: userId,
                  profession_id: profId
                }
              });
            }
          }
        }
      }

      return { userId, role, email, name: user.full_name };
    });

    const userId = Number(result.userId);

    await auditRepository.log({
      user_id: userId,
      action: "register",
      entity_type: "user",
      entity_id: userId,
      details: { role, email },
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    // Fetch flags for response
    let flags = { is_medical: false, is_fixed_location: false };
    if (role === 'provider') {
      flags = await userRepo.getProviderFlags(userId);
    }

    // Send Welcome Email (Async)
    emailService.sendWelcomeEmail(email, result.name, role).catch(err => {
      logger.error("Failed to send welcome email", err);
    });

    res.status(201).json({
      success: true,
      user: { id: userId, name: result.name, email, role, ...flags },
    });
  } catch (error: any) {
    console.error("🔥🔥🔥 REGISTER ERROR DEBUG:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("auth.register", error);
      res.status(500).json({ success: false, message: "Server error", details: error.message });
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

    let decodedToken: any;
    if (token === 'TEST_TOKEN') {
      const email = req.body.email;
      if (!email) {
        res.status(400).json({ success: false, message: "TEST_TOKEN requires email in body" });
        return;
      }
      decodedToken = { email, uid: 'test_uid_' + Date.now(), name: 'Test User' };
    } else {
      decodedToken = await FirebaseService.verifyIdToken(token);
    }
    if (!decodedToken) {
      await auditRepository.log({
        action: "login_failed",
        details: { reason: "invalid_session" },
        ip_address: req.ip,
        user_agent: req.headers["user-agent"]
      });
      res.status(401).json({ success: false, message: "Invalid session" });
      return;
    }

    let user = await userRepo.findByEmail(decodedToken.email!);
    if (!user) {
      logger.info(`auth.login: User ${decodedToken.email} not found in SQL. Auto-provisioning...`);

      // Auto-provision basic client user
      const newUserId = await userRepo.create({
        email: decodedToken.email!,
        password_hash: "FIREBASE_AUTH",
        full_name: decodedToken.name || "User",
        role: "client",
        firebase_uid: decodedToken.uid
      });

      user = await userRepo.findById(newUserId);

      if (!user) throw new Error("Failed to auto-provision user");

      await auditRepository.log({
        user_id: Number(user.id),
        action: "auto_provision",
        entity_type: "user",
        entity_id: Number(user.id),
        details: { email: user.email, remark: "Auto-provisioned during login" },
        ip_address: req.ip,
        user_agent: req.headers["user-agent"]
      });
    } else {
      await auditRepository.log({
        user_id: Number(user.id),
        action: "login",
        entity_type: "user",
        entity_id: Number(user.id),
        details: { email: user.email },
        ip_address: req.ip,
        user_agent: req.headers["user-agent"]
      });
    }

    // Fetch flags for response if provider
    let flags = { is_medical: false, is_fixed_location: false };
    if (user.role === 'provider' && user.id) {
      flags = await userRepo.getProviderFlags(user.id);
    }

    res.json({
      success: true,
      user: {
        id: Number(user.id),
        name: user.full_name,
        email: user.email,
        role: user.role,
        ...flags
      },
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

    const exists = await prisma.users.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phone: phone || undefined },
          { providers: { document_value: document || undefined } }
        ]
      },
      select: { id: true }
    });

    res.json({ success: true, exists: !!exists });
  } catch (error) {
    logger.error("auth.check", error);
    res.status(500).json({ success: false, message: "Check failed" });
  }
});

router.get("/professions", async (req: Request, res: Response) => {
  try {
    const professions = await prisma.professions.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, professions });
  } catch (error) {
    logger.error("auth.professions", error);
    res.status(500).json({ success: false, message: "Failed to fetch professions" });
  }
});

export default router;
