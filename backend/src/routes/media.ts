import { Router, Request, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import admin from "../config/firebase";
import { UserRepository } from "../repositories/userRepository";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharp: any = null;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});
const userRepo = new UserRepository();
const bucket = admin.storage().bucket();

// Avatar endpoints (keeping blob storage for now as requested or until specifically asked to change avatars)
router.post(
  "/avatar",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user;
    try {
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file provided" });
        return;
      }
      if (!sharp) {
        res.status(501).json({ success: false, message: "Image processing unavailable" });
        return;
      }
      const thumbWebp = await sharp(req.file.buffer)
        .resize(128, 128, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
      await userRepo.updateAvatarBlob(user.id!, thumbWebp);
      res.status(201).json({ success: true });
    } catch {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

router.get("/avatar/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id!;
    const blob = await userRepo.getAvatarBlob(userId);
    if (!blob) {
      res.status(204).end();
      return;
    }
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.status(200).send(blob);
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch avatar" });
  }
});

router.get("/avatar/:userId", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }
    const blob = await userRepo.getAvatarBlob(userId);
    if (!blob) {
      res.status(404).json({ success: false, message: "Avatar not found" });
      return;
    }
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(blob);
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch avatar" });
  }
});

// Chat Media (Firebase Storage)
router.post(
  "/chat/image",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const serviceId = (req.body.serviceId || req.query.serviceId) as string | undefined;
      if (!req.file || !serviceId) {
        res.status(400).json({ success: false, message: "Missing file or serviceId" });
        return;
      }
      if (!sharp) {
        res.status(501).json({ success: false, message: "Image processing unavailable" });
        return;
      }
      const key = `chat/${serviceId}/${uuidv4()}.webp`;
      const webp = await sharp(req.file.buffer)
        .resize(1920, 1920, { fit: "inside" })
        .webp({ quality: 82 })
        .toBuffer();

      await bucket.file(key).save(webp, {
        metadata: { contentType: "image/webp" }
      });

      res.status(201).json({ success: true, key });
    } catch (error) {
      console.error("Chat image upload error:", error);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

router.post(
  "/chat/video",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const serviceId = (req.body.serviceId || req.query.serviceId) as string | undefined;
      if (!req.file || !serviceId) {
        res.status(400).json({ success: false, message: "Missing file or serviceId" });
        return;
      }
      const mime = req.file.mimetype;
      const ext = mime.includes("webm") ? "webm" : (mime.includes("quicktime") ? "mov" : "mp4");
      const key = `chat/${serviceId}/${uuidv4()}.${ext}`;

      await bucket.file(key).save(req.file.buffer, {
        metadata: { contentType: mime }
      });
      res.status(201).json({ success: true, key });
    } catch (error) {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

router.post(
  "/chat/audio",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const serviceId = (req.body.serviceId || req.query.serviceId || req.body.service_id || req.query.service_id) as string | undefined;
      if (!req.file || !serviceId) {
        res.status(400).json({ success: false, message: "Missing file or serviceId" });
        return;
      }
      const mime = (req.file.mimetype || "").toLowerCase();
      const ext = mime.includes("mpeg") ? "mp3" : (mime.includes("wav") ? "wav" : "m4a");
      const key = `chat/${serviceId}/${uuidv4()}.${ext}`;

      await bucket.file(key).save(req.file.buffer, {
        metadata: { contentType: mime }
      });
      res.status(201).json({ success: true, key });
    } catch {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

// Service Media (Firebase Storage)
router.post(
  "/service/image",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      if (!sharp) return res.status(501).json({ success: false, message: "No sharp" });

      const key = `service/temp/${uuidv4()}.webp`;
      const webp = await sharp(req.file.buffer)
        .resize(1920, 1920, { fit: "inside" })
        .webp({ quality: 82 })
        .toBuffer();

      await bucket.file(key).save(webp, {
        metadata: { contentType: "image/webp" }
      });
      res.status(201).json({ success: true, key });
    } catch {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

router.post(
  "/service/video",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const mime = req.file.mimetype;
      const ext = mime.includes("webm") ? "webm" : (mime.includes("quicktime") ? "mov" : "mp4");
      const key = `service/temp/${uuidv4()}.${ext}`;
      await bucket.file(key).save(req.file.buffer, {
        metadata: { contentType: mime }
      });
      res.status(201).json({ success: true, key });
    } catch {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

router.post(
  "/service/audio",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: "No file" });
      const mime = (req.file.mimetype || "").toLowerCase();
      const ext = mime.includes("wav") ? "wav" : (mime.includes("mpeg") ? "mp3" : "m4a");
      const key = `service/temp/${uuidv4()}.${ext}`;
      await bucket.file(key).save(req.file.buffer, {
        metadata: { contentType: mime || "audio/mp4" }
      });
      res.status(201).json({ success: true, key });
    } catch {
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

// View / Content Endpoints
router.get("/view", authMiddleware, async (req: Request, res: Response) => {
  try {
    const key = (req.query.key as string) || "";
    if (!key) return res.status(400).json({ success: false, message: "Missing key" });

    const [signed] = await bucket.file(key).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 30 * 1000 // 30 minutes
    });
    res.json({ success: true, url: signed });
  } catch {
    res.status(500).json({ success: false, message: "Failed to sign URL" });
  }
});

router.get("/content", authMiddleware, async (req: Request, res: Response) => {
  try {
    const key = (req.query.key as string) || "";
    if (!key) return res.status(400).json({ success: false, message: "Missing key" });

    const [signed] = await bucket.file(key).getSignedUrl({
      action: 'read',
      expires: Date.now() + 3600 * 1000 // 1 hour
    });
    res.redirect(signed);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch media" });
  }
});

export default router;
