import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { UserRepository } from "../repositories/userRepository";
import { firebaseAuth } from "../config/firebase";
import logger from "../utils/logger";

const router = Router();
const userRepo = new UserRepository();

// Get Current User Profile
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const fullUser = await userRepo.findById(user.id!);
    if (!fullUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    let displayName = fullUser.full_name;
    let commercialName = undefined;
    let professions: { name: string; service_type: string }[] = [];

    if (fullUser.role === "provider") {
      const providerDetails = await userRepo.getProviderDetails(fullUser.id!);
      if (providerDetails?.commercial_name) {
        commercialName = providerDetails.commercial_name;
        displayName = commercialName; // Use commercial name as display name for providers
      }
      professions = await userRepo.getProviderProfessions(fullUser.id!);
    }

    res.json({
      success: true,
      user: {
        id: fullUser.id,
        full_name: fullUser.full_name,
        name: displayName, // Field used by frontend
        commercial_name: commercialName,
        email: fullUser.email,
        phone: fullUser.phone,
        role: fullUser.role,
        professions: professions,
        // avatar_url ou blob seriam tratados via endpoint de media ou separadamente
      },
    });
  } catch (error) {
    logger.error("profile.me.get", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Provider Specialties
router.get(
  "/specialties",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const specialties = await userRepo.getProviderProfessions(user.id!);
      res.json({ success: true, specialties });
    } catch (error) {
      logger.error("profile.specialties.get", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

const addSpecialtySchema = z.object({
  name: z.string().min(2),
});

// Add Specialty
router.post(
  "/specialties",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const { name } = addSpecialtySchema.parse(req.body);

      // Validate if profession exists
      const profession = await userRepo.findProfessionByName(name.trim());
      if (!profession) {
        res
          .status(400)
          .json({
            success: false,
            message: "Profissão inválida. Selecione uma da lista.",
          });
        return;
      }

      await userRepo.addProviderProfession(user.id!, profession.id);

      res.status(201).json({ success: true, message: "Profissão adicionada" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues });
      } else {
        logger.error("profile.specialties.add", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  },
);

// Remove Specialty
router.delete(
  "/specialties/:name",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const name = req.params.name;
      await userRepo.removeProviderProfession(user.id!, name);

      res.json({ success: true, message: "Specialty removed" });
    } catch (error) {
      logger.error("profile.specialties.remove", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

const updateProviderSchema = z.object({
  document_type: z.enum(["cpf", "cnpj"]).optional(),
  document_value: z.string().optional(),
  commercial_name: z.string().optional(),
  professions: z
    .array(
      z.union([z.string(), z.object({ id: z.number(), name: z.string() })]),
    )
    .optional(),
});

// Update Provider Profile (Document, Commercial Name, Professions)
router.put("/provider", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user || user.role !== "provider") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const data = updateProviderSchema.parse(req.body);

    // Update Provider Extra Info
    await userRepo.updateProviderExtra(user.id!, {
      document_type: data.document_type,
      document_value: data.document_value,
      commercial_name: data.commercial_name,
    });

    // Update Professions if provided
    if (data.professions && data.professions.length > 0) {
      const professionIds: number[] = [];

      for (const p of data.professions) {
        if (typeof p === "string") {
          const name = p.trim();
          if (name.length > 0) {
            const pid = await userRepo.upsertProfession(name);
            if (pid) professionIds.push(pid);
          }
        } else if (typeof p === "object" && p !== null) {
          if (p.id && typeof p.id === "number") {
            professionIds.push(p.id);
          } else if (p.name && typeof p.name === "string") {
            const name = p.name.trim();
            if (name.length > 0) {
              const pid = await userRepo.upsertProfession(name);
              if (pid) professionIds.push(pid);
            }
          }
        }
      }

      // Remover duplicatas
      const uniqueIds = Array.from(new Set(professionIds));

      if (uniqueIds.length > 0) {
        await userRepo.setProviderProfessions(user.id!, uniqueIds);
      }
    }

    res.json({ success: true, message: "Provider profile updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("profile.provider.update", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});

// Delete Account
router.delete("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // 1. Get Full User to get Firebase UID
    const fullUser = await userRepo.findById(user.id!);
    if (!fullUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // 2. Delete from Firebase (Best Effort)
    if (fullUser.firebase_uid) {
      try {
        logger.info(
          `profile.delete: Attempting to delete firebase user ${fullUser.firebase_uid}`,
        );
        await firebaseAuth.deleteUser(fullUser.firebase_uid);
        logger.info("profile.delete: Firebase user deleted");
      } catch (fbError: any) {
        // Completely swallow firebase errors to ensure local deletion happens
        // Just log for debug purposes
        const errorCode = fbError?.code || "unknown";
        const errorMessage = fbError?.message || String(fbError);

        if (errorCode === "auth/user-not-found") {
          logger.info(
            "profile.delete.firebase: User already deleted in Firebase",
          );
        } else {
          logger.info(
            "profile.delete.firebase (warn): Failed to delete from Firebase, but proceeding with local deletion",
            {
              error: errorMessage,
              code: errorCode,
            },
          );
        }
      }
    } else {
      logger.info(
        "profile.delete: No firebase_uid found for user, skipping firebase deletion",
      );
    }

    // 3. Delete from Local DB
    logger.info(`profile.delete: Deleting user ${user.id} from local DB`);
    await userRepo.delete(user.id!);
    logger.info(`profile.delete: User ${user.id} deleted locally`);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    logger.error("profile.delete", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
