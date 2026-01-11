import { Request, Response, Router } from "express";
import { FieldPacket, RowDataPacket } from "mysql2";
import { z } from "zod";
import { classifyText, clearCache, findBestTask } from "../ai/aiConnector";
import { generateTasks as aiGenerateTasks } from "../ai/tasks";
import pool from "../database/db";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { notificationManager, TEMPLATES } from "../notifications/manager";
import { io } from "../platform";
import { ServiceRepository } from "../repositories/serviceRepository";
import { emailService } from "../services/emailService";
import { providerDispatcher } from "../services/providerDispatcher";
import logger from "../utils/logger";

const router = Router();
const serviceRepo = new ServiceRepository();

// List Professions
router.get("/professions", async (_req: Request, res: Response) => {
  try {
    const [rows] = (await pool.query(
      "SELECT * FROM professions ORDER BY name ASC",
    )) as [RowDataPacket[], FieldPacket[]];
    res.json({ success: true, professions: rows });
  } catch (error) {
    logger.error("services.professions", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// List Tasks for Profession
router.get("/professions/:id/tasks", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = (await pool.query(
      "SELECT * FROM task_catalog WHERE profession_id = ? AND active = 1 ORDER BY name ASC",
      [id]
    )) as [RowDataPacket[], FieldPacket[]];
    res.json({ success: true, tasks: rows });
  } catch (error) {
    logger.error("services.professionTasks", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Validation Schemas
const createServiceSchema = z.object({
  category_id: z.number(),
  description: z.string().min(10),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
  price_estimated: z.number().optional(),
  price_upfront: z.number().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  audios: z.array(z.string()).optional(),
  profession: z.string().optional(),
  scheduled_at: z.string().optional(),
});

const aiRequestSchema = z.object({
  text: z.string().min(6),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  audios: z.array(z.string()).optional(),
});

// Create Service (Client)
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (user?.role !== "client") {
      res
        .status(403)
        .json({ success: false, message: "Only clients can create services" });
      return;
    }

    const data = createServiceSchema.parse(req.body);
    let categoryId = data.category_id;
    const parsed = await classifyText(data.description);
    if (parsed && parsed.category_id) categoryId = parsed.category_id;

    // 🛡️ Fallback: Ensure category_id is never null (Fix DB Integrity Error)
    if (!categoryId) {
      if (parsed?.name) {
        try {
          // 1. Try to find category in professions table
          const [rows] = (await pool.query(
            "SELECT category_id FROM professions WHERE name = ?",
            [parsed.name]
          )) as [RowDataPacket[], FieldPacket[]];

          if (rows.length > 0 && rows[0].category_id) {
            categoryId = rows[0].category_id;
          }
        } catch (err) {
          logger.warn("Fallback category lookup failed", err);
        }
      }

      // 2. Final Fallback: Use default ID (1 = Encanamento/Geral) if still null
      if (!categoryId) categoryId = 1;
    }

    const profId = parsed?.id || 0;

    let tasks: {
      name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }[] = [];
    try {
      const aiTasks = await aiGenerateTasks(data.description, profId);
      tasks = aiTasks.map((t) => ({
        name: t.description,
        quantity: 1,
        unit_price: t.subtotal,
        subtotal: t.subtotal,
      }));
    } catch (e) {
      logger.error("ai.generateTasks", e);
      // Fallback if AI fails
    }

    const tasksCost = tasks.reduce((sum, t) => sum + t.subtotal, 0);
    // Use provided price if available and AI returned 0 (or failed), otherwise use AI price
    const priceEstimated = tasksCost > 0 ? tasksCost : data.price_estimated || 0;

    // Calculate Upfront (30% of Total)
    const priceUpfront = Math.round(priceEstimated * 0.3 * 100) / 100;

    const id = await serviceRepo.create({
      client_id: user.id!,
      category_id: categoryId,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      price_estimated: priceEstimated,
      price_upfront: priceUpfront,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
      images: data.images,
      video: data.video,
      audios: data.audios,
      profession: data.profession || parsed?.name,
      status: 'pending' // Force pending for immediate visibility
    });
    await serviceRepo.addTasks(id, tasks);

    // Start Dispatch Immediately (Skip Payment for Testing)
    providerDispatcher.startDispatch(id);

    logger.service("service.created", {
      id,
      client_id: user.id,
      category_id: categoryId,
      profession: data.profession || parsed?.name,
      price_estimated: priceEstimated,
      price_upfront: priceUpfront,
    });

    // Notification is triggered after payment confirmation

    res
      .status(201)
      .json({
        success: true,
        id,
        message: "Service request created. Waiting for payment.",
      });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("services.create", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});

router.post("/ai", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const data = aiRequestSchema.parse(req.body);
    const parsed = await classifyText(data.text);
    const threshold = 0.3; // Using a lower threshold for local classifier's weighted scores
    if (!parsed || parsed.score < threshold) {
      res.json({
        success: true,
        encontrado: false,
        message:
          "Não consegui identificar o profissional. Pode dar mais detalhes?",
      });
      return;
    }
    res.json({
      success: true,
      encontrado: true,
      categoria: parsed.category_name,
      categoria_id: parsed.category_id,
      profissao: parsed.name,
      profissao_id: parsed.id,
      confianca: Number(Math.min(1, parsed.score).toFixed(2)),
      sugestao_acao: `Deseja chamar um ${parsed.name}?`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.issues });
    } else {
      logger.error("services.ai", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});

router.post(
  "/ai/classify",
  // authMiddleware, // Temporarily disabled for testing
  async (req: Request, res: Response) => {
    try {
      const data = aiRequestSchema.parse(req.body);
      const parsed = await classifyText(data.text);
      const threshold = 0.3;

      let result: any = {
        success: true,
        encontrado: false,
        text: data.text
      };

      // 1. Profession Detection
      if (parsed && parsed.score >= threshold) {
        result.encontrado = true;
        result.categoria = parsed.category_name;
        result.categoria_id = parsed.category_id;
        result.profissao = parsed.name;
        result.profissao_id = parsed.id;
        result.confianca = Number(Math.min(1, parsed.score).toFixed(2));
        result.explicacao = parsed.explanation;
        result.service_type = parsed.service_type;
      }

      // 2. Task Catalog Search
      // Logic: Search in task_catalog using profession as reference or fallback to global search
      let taskMatch = null;

      // 🚀 NEW: Check if AI already identified the task (Local AI with Knowledge Base)
      if (parsed && parsed.task_id) {
        const [tasks] = (await pool.query("SELECT * FROM task_catalog WHERE id = ?", [parsed.task_id])) as [RowDataPacket[], FieldPacket[]];
        if (tasks.length > 0) {
          taskMatch = tasks[0];
          // Boost confidence since AI matched a specific task phrase
          result.confianca = Math.max(result.confianca || 0, parsed.score);
          result.explicacao = `Identificado diretamente pela IA: ${taskMatch.name}`;

          // Ensure profession is set if it wasn't already (though it should be)
          if (!result.profissao_id) {
            result.encontrado = true;
            result.profissao = parsed.name;
            result.profissao_id = parsed.id;
            result.categoria_id = parsed.category_id;
          }
        }
      }

      // Helper to extract keywords if AI fails
      const extractKeywords = (text: string) => {
        const stopwords = ["quero", "fazer", "uma", "um", "a", "o", "de", "da", "do", "em", "para", "com", "por", "preciso", "necessito", "gostaria", "busco", "prokuro", "serviço", "contratar", "fui"];
        return text
          .toLowerCase()
          .split(/[\s,.]+/)
          .filter(w => w.length > 2 && !stopwords.includes(w));
      };

      // Use search_term from AI if available, otherwise fallback to text
      let rawSearchTerm = (parsed?.search_term && parsed.search_term.length > 1) ? parsed.search_term : data.text;

      // If AI didn't return a clean search term, try to clean it manually
      if (!parsed?.search_term || parsed.search_term === data.text) {
        const keywords = extractKeywords(data.text);
        if (keywords.length > 0) {
          // Prioritize the last word as it's often the object (e.g. "instalar *tomada*", "fazer *barba*")
          // But "barba" is better than "fazer".
          // Let's just join them for a broader search if multiple, or pick one.
          // For "quero fazer a barba" -> ["barba"] -> "barba"
          // For "arrumar pia cozinha" -> ["arrumar", "pia", "cozinha"] -> "arrumar pia cozinha"
          rawSearchTerm = keywords.join(" ");
        }
      }

      const searchTerm = `%${rawSearchTerm}%`;

      // If profession found, search tasks for that profession first
      if (result.profissao_id) {
        // Fetch ALL tasks for this profession to let AI pick the best one
        const [tasks] = (await pool.query(
          `SELECT * FROM task_catalog 
              WHERE profession_id = ? AND active = 1
              ORDER BY id ASC`,
          [result.profissao_id]
        )) as [RowDataPacket[], FieldPacket[]];

        if (tasks.length > 0) {
          // 1. Try AI matching first (Semantic Search) - User requested "mais proximo"
          const bestMatch = await findBestTask(data.text, tasks);

          if (bestMatch && bestMatch.task_id) {
            taskMatch = tasks.find(t => t.id === bestMatch.task_id);
            if (taskMatch) {
              // Boost confidence if AI is sure
              if (bestMatch.confidence > 0.7) {
                result.confianca = Math.max(result.confianca, bestMatch.confidence);
              }
              result.explicacao = bestMatch.reasoning || result.explicacao;
            }
          }

          // 2. Fallback to SQL LIKE if AI didn't find a match
          if (!taskMatch) {
            const simpleMatch = tasks.find(t =>
              t.name.toLowerCase().includes(rawSearchTerm.toLowerCase()) ||
              (t.keywords && t.keywords.toLowerCase().includes(rawSearchTerm.toLowerCase()))
            );
            if (simpleMatch) taskMatch = simpleMatch;
          }
        }
      }

      // If no task found yet, search all tasks (Global Task Search)
      if (!taskMatch) {
        const [tasks] = (await pool.query(
          `SELECT * FROM task_catalog 
              WHERE name LIKE ? OR keywords LIKE ? 
              ORDER BY id DESC LIMIT 1`,
          [searchTerm, searchTerm]
        )) as [RowDataPacket[], FieldPacket[]];

        if (tasks.length > 0) {
          taskMatch = tasks[0];
          // If we found a task but didn't have a profession (or found a different one), we can infer/update it
          // especially if the AI confidence was low
          if (!result.encontrado || result.confianca < 0.7) {
            const [profs] = (await pool.query(
              "SELECT * FROM professions WHERE id = ?",
              [taskMatch.profession_id]
            )) as [RowDataPacket[], FieldPacket[]];

            if (profs.length > 0) {
              const p = profs[0];
              result.encontrado = true;
              result.profissao = p.name;
              result.profissao_id = p.id;
              result.categoria_id = p.category_id;
              result.confianca = 0.95; // High confidence if task matched
              result.explicacao = `Identificado através do serviço '${taskMatch.name}'`;
            }
          }
        }
      }

      // Fallback: If Profession NOT found (or low confidence), search Professions table directly
      // Scenario: "quero cortar a barba" -> AI might miss it, but "Barbeiro" exists in DB with keyword "barba"
      if (!result.encontrado || result.confianca < 0.4) {
        const [profs] = (await pool.query(
          `SELECT * FROM professions 
               WHERE name LIKE ? OR keywords LIKE ? 
               ORDER BY service_type ASC LIMIT 1`,
          [searchTerm, searchTerm]
        )) as [RowDataPacket[], FieldPacket[]];

        if (profs.length > 0) {
          const p = profs[0];
          result.encontrado = true;
          result.profissao = p.name;
          result.profissao_id = p.id;
          result.categoria_id = p.category_id;
          result.confianca = 0.8;
          result.explicacao = `Identificado por busca direta: ${p.name}`;
        }
      }

      if (taskMatch) {
        result.task = taskMatch;
        result.sugestao_servico = `Encontrei o serviço: ${taskMatch.name} - R$ ${taskMatch.unit_price}`;
      } else if (result.encontrado) {
        result.needs_details = true;
        result.message = `Identifiquei que você precisa de um ${result.profissao}. Pode dar mais detalhes (tamanho, quantidade, etc) para eu estimar o valor?`;
      } else if (!result.encontrado) {
        result.message = "Não consegui identificar o profissional. Pode dar mais detalhes?";
      }

      res.json(result);

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues });
      } else {
        logger.error("services.ai.classify", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  },
);



// List My Services (Client or Provider)
router.get("/my", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    let services = [];

    if (user?.role === "provider") {
      services = await serviceRepo.findByProvider(user.id!);
    } else {
      services = await serviceRepo.findByClient(user!.id!);
    }

    res.json({ success: true, services });
  } catch (error) {
    logger.error("services.my", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// List Available Services (Provider Dashboard)
router.get(
  "/available",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      const services = await serviceRepo.findPendingForProviderWithDistance(
        user.id!,
      );
      res.json({ success: true, services });
    } catch (error) {
      logger.error("services.available", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Get Service Details
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const service = await serviceRepo.findById(req.params.id);
    if (!service) {
      res.status(404).json({ success: false, message: "Service not found" });
      return;
    }
    const result = {
      ...service,
      config_require_location_start: false, // Force false based on user request (distance error)
    };
    res.json({ success: true, service: result });
  } catch (error) {
    logger.error("services.details", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const editRequestSchema = z.object({
  reason: z.string().min(3),
  description: z.string().optional().default(""),
  additional_value: z.number().positive(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
});

router.post(
  "/:id/edit-request",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only providers can request edits",
          });
        return;
      }
      const existingService = await serviceRepo.findById(req.params.id);
      if (!existingService) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }
      if (existingService.provider_id !== user.id) {
        res
          .status(403)
          .json({
            success: false,
            message: "Only the assigned provider can request edits",
          });
        return;
      }
      const data = editRequestSchema.parse(req.body);
      const editId = await serviceRepo.createEditRequest({
        service_id: req.params.id,
        provider_id: user.id!,
        reason: data.reason,
        description: data.description || "",
        additional_value: data.additional_value,
        images: data.images,
        video: data.video || null,
      });
      io.to(`service:${req.params.id}`).emit("service.edit_request", {
        id: editId,
        service_id: req.params.id,
      });
      logger.service("service.edit_request", {
        id: editId,
        service_id: req.params.id,
        provider_id: user.id,
        additional_value: data.additional_value,
      });

      // Notify Client (Push)
      if (existingService) {
        const providerName = user.full_name || "O prestador";
        const tmpl = TEMPLATES.EDIT_REQUEST(); // Assuming template exists or using generic
        const body = `${providerName} solicitou um ajuste de valor de R$ ${data.additional_value.toFixed(2)}`;

        notificationManager.send(
          Number(existingService.client_id),
          "edit_request",
          req.params.id,
          tmpl.title,
          body,
          { service_id: req.params.id, edit_request_id: editId },
        ).catch(err => logger.error("notification.edit_request", err));
      }

      res.status(201).json({ success: true, id: editId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues });
      } else {
        logger.error("services.edit_request", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  },
);

router.get(
  "/:id/edit-requests",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const list = await serviceRepo.listEditRequests(req.params.id);
      res.json({ success: true, edit_requests: list });
    } catch (error) {
      logger.error("services.edit_requests.list", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.post(
  "/:id/edit-request/:reqId/accept",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "client") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only clients can accept edit requests",
          });
        return;
      }
      const ok = await serviceRepo.acceptEditRequest(
        req.params.id,
        Number(req.params.reqId),
      );
      if (ok) {
        io.to(`service:${req.params.id}`).emit(
          "service.edit_request.accepted",
          { id: Number(req.params.reqId), service_id: req.params.id },
        );
        res.json({ success: true });
      } else {
        res
          .status(404)
          .json({
            success: false,
            message: "Edit request not found or already decided",
          });
      }
    } catch (error) {
      logger.error("services.edit_requests.accept", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.post(
  "/:id/edit-request/:reqId/decline",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "client") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only clients can decline edit requests",
          });
        return;
      }
      const ok = await serviceRepo.declineEditRequest(
        req.params.id,
        Number(req.params.reqId),
      );
      if (ok) {
        io.to(`service:${req.params.id}`).emit(
          "service.edit_request.declined",
          { id: Number(req.params.reqId), service_id: req.params.id },
        );
        res.json({ success: true });
      } else {
        res
          .status(404)
          .json({
            success: false,
            message: "Edit request not found or already decided",
          });
      }
    } catch (error) {
      logger.error("services.edit_requests.decline", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Provider Reject Service
router.post(
  "/:id/reject",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only providers can reject services",
          });
        return;
      }
      await serviceRepo.reject(req.params.id, user.id!);
      await providerDispatcher.reject(req.params.id, user.id!);
      res.json({ success: true });
    } catch (error) {
      logger.error("services.reject", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Provider Accept Service
router.post(
  "/:id/accept",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only providers can accept services",
          });
        return;
      }

      const success = await serviceRepo.acceptService(req.params.id, user.id!);
      if (success) {
        await providerDispatcher.stopDispatch(req.params.id);
        await serviceRepo.applyTravelCost(req.params.id, user.id!);
        logger.service("service.accepted", {
          id: req.params.id,
          provider_id: user.id,
        });
        io.to(`service:${req.params.id}`).emit("service.accepted", {
          id: req.params.id,
          provider_id: user.id,
        });
        io.to(`service:${req.params.id}`).emit("service.status", { id: req.params.id, status: "accepted" });

        // Notify Client (Push Notification)
        (async () => {
          const service = await serviceRepo.findById(req.params.id);
          if (service) {
            // Emit to Client's user room for realtime updates on Home Screen
            io.to(`user:${service.client_id}`).emit("service.status", { id: req.params.id, status: "accepted" });

            const providerName = user.full_name || "Um prestador";
            const tmpl = TEMPLATES.SERVICE_ACCEPTED();
            // Customize body with provider name
            const body = `${providerName} aceitou seu serviço!`;

            const avatarUrl = `https://cardapyia.com/api/media/avatar/${user.id}`;

            // Send Email to Client
            if (service.client_email) {
              emailService.sendServiceAcceptedEmail(
                service.client_email,
                providerName,
                service.description || "Serviço solicitado"
              ).catch(err => logger.error("email.accepted", err));
            }

            await notificationManager.send(
              Number(service.client_id),
              "service_accepted",
              req.params.id,
              tmpl.title,
              body,
              { service_id: req.params.id },
              avatarUrl,
            );
          }
        })().catch((err) => logger.error("notification.accepted", err));

        res.json({ success: true, message: "Service accepted!" });
      } else {
        res
          .status(409)
          .json({
            success: false,
            message: "Service already taken or unavailable",
          });
      }
    } catch (error) {
      logger.error("services.accept", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Provider Start Service (set in_progress)
router.post(
  "/:id/start",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only providers can start services",
          });
        return;
      }

      const ok = await serviceRepo.updateStatus(req.params.id, "in_progress");
      if (ok) {
        io.to(`service:${req.params.id}`).emit("service.in_progress", {
          id: req.params.id,
          provider_id: user.id,
        });
        io.to(`service:${req.params.id}`).emit("service.status", { id: req.params.id, status: "in_progress" });

        // Notify Client (Push)
        const service = await serviceRepo.findById(req.params.id);
        if (service) {
          io.to(`user:${service.client_id}`).emit("service.status", { id: req.params.id, status: "in_progress" });

          const providerName = user.full_name || "O prestador";
          const tmpl = TEMPLATES.SERVICE_STARTED(); // Assuming TEMPLATES has SERVICE_STARTED
          // Fallback if template doesn't exist or we want custom body
          const title = tmpl?.title || "Serviço Iniciado";
          const body = `${providerName} iniciou o serviço.`;

          notificationManager
            .send(
              Number(service.client_id),
              "service_started",
              req.params.id,
              title,
              body,
              { service_id: req.params.id },
            )
            .catch((err) => logger.error("notification.started", err));
        }

        res.json({ success: true, message: "Service started" });
      } else {
        res.status(404).json({ success: false, message: "Service not found" });
      }
    } catch (error) {
      logger.error("services.start", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Provider Complete Service (set completed)
router.post(
  "/:id/complete",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only providers can complete services",
          });
        return;
      }

      const ok = await serviceRepo.updateStatus(req.params.id, "completed");
      if (ok) {
        io.to(`service:${req.params.id}`).emit("service.completed", {
          id: req.params.id,
          provider_id: user.id,
        });
        io.to(`service:${req.params.id}`).emit("service.status", { id: req.params.id, status: "completed" });

        // Notify Client
        const service = await serviceRepo.findById(req.params.id);
        if (service) {
          io.to(`user:${service.client_id}`).emit("service.status", { id: req.params.id, status: "completed" });

          const tmpl = TEMPLATES.SERVICE_COMPLETED();
          notificationManager
            .send(
              Number(service.client_id),
              "service_completed",
              req.params.id,
              tmpl.title,
              tmpl.body,
              { service_id: req.params.id },
            )
            .catch((err) => logger.error("notification.completed", err));
        }

        res.json({ success: true, message: "Service completed" });
      } else {
        res.status(404).json({ success: false, message: "Service not found" });
      }
    } catch (error) {
      logger.error("services.complete", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Client Cancel Service (pending only)
router.post(
  "/:id/cancel",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "client") {
        res
          .status(403)
          .json({
            success: false,
            message: "Only clients can cancel services",
          });
        return;
      }

      // Get service before cancelling to check provider
      const service = await serviceRepo.findById(req.params.id);

      const success = await serviceRepo.cancelService(req.params.id, user.id!);
      if (success) {
        io.to(`service:${req.params.id}`).emit("service.status", { id: req.params.id, status: "cancelled" });

        // Notify Provider if assigned
        if (service && service.provider_id) {
          io.to(`user:${service.provider_id}`).emit("service.status", { id: req.params.id, status: "cancelled" });

          const tmpl = TEMPLATES.SERVICE_CANCELLED();
          notificationManager
            .send(
              Number(service.provider_id),
              "service_cancelled",
              req.params.id,
              tmpl.title,
              tmpl.body,
              { service_id: req.params.id },
            )
            .catch((err) => logger.error("notification.cancelled", err));
        }

        res.json({ success: true, message: "Service cancelled" });
      } else {
        res
          .status(404)
          .json({
            success: false,
            message: "Service not found or cannot be cancelled",
          });
      }
    } catch (error) {
      logger.error("services.cancel", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// DEBUG: Trigger dispatch manually
router.post(
  "/:id/dispatch",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id;
      logger.info(`Manually triggering dispatch for service ${serviceId}`);
      await providerDispatcher.startDispatch(serviceId);
      res.json({ success: true, message: "Dispatch triggered" });
    } catch (error) {
      logger.error("services.dispatch", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// DEV: Trigger Dispatch Manually
router.post(
  "/:id/dispatch",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id;
      logger.info(`Manual dispatch trigger for service ${serviceId}`);
      await providerDispatcher.startDispatch(serviceId);
      res.json({ success: true, message: "Dispatch triggered" });
    } catch (error) {
      logger.error("services.dispatch", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);





// Provider/Client Arrived (Logic depends on location_type)
router.post(
  "/:id/arrive",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      const serviceId = req.params.id;
      const service = await serviceRepo.findById(serviceId);

      if (!service) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      // Flow A: Provider goes to Client (default)
      // Flow B: Client goes to Provider (if location_type === 'provider')
      const isProviderLocation = service.location_type === 'provider';

      if (isProviderLocation) {
        // Client arriving
        if (user?.role !== 'client') {
          res.status(403).json({ success: false, message: "Only client can mark arrival for this service type" });
          return;
        }
      } else {
        // Provider arriving
        if (user?.role !== 'provider') {
          res.status(403).json({ success: false, message: "Only provider can mark arrival for this service type" });
          return;
        }
      }

      await serviceRepo.updateArrived(serviceId);

      // Notify counterpart
      const targetId = isProviderLocation ? service.provider_id : service.client_id;
      const tmpl = isProviderLocation ? TEMPLATES.CLIENT_ARRIVED() : TEMPLATES.PROVIDER_ARRIVED();

      // Emit socket event for realtime updates
      io.to(`service:${serviceId}`).emit("service.updated", { id: serviceId, status: service.status, arrived: true });

      if (targetId) {
        notificationManager.send(
          Number(targetId),
          "service_arrived",
          serviceId,
          tmpl.title,
          tmpl.body,
          { service_id: serviceId }
        ).catch(console.error);
      }

      res.json({ success: true, message: "Arrival confirmed" });
    } catch (error) {
      logger.error("services.arrive", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Pay Remaining
router.post(
  "/:id/pay_remaining",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      const serviceId = req.params.id;

      // In real world: Process Payment Gateway here

      await serviceRepo.updatePaymentRemaining(serviceId);

      const service = await serviceRepo.findById(serviceId);

      // Emit socket event
      io.to(`service:${serviceId}`).emit("service.updated", { id: serviceId, payment_remaining: 'paid' });

      if (service && service.provider_id) {
        const tmpl = TEMPLATES.PAYMENT_REMAINING_PAID();
        notificationManager.send(
          Number(service.provider_id),
          "payment_remaining",
          serviceId,
          tmpl.title,
          tmpl.body,
          { service_id: serviceId }
        ).catch(console.error);
      }

      res.json({ success: true, message: "Payment confirmed" });
    } catch (error) {
      logger.error("services.pay_remaining", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Contest Service
router.post(
  "/:id/contest",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      const { reason } = req.body;
      const serviceId = req.params.id;

      if (!reason) {
        res.status(400).json({ success: false, message: "Reason required" });
        return;
      }

      await serviceRepo.updateContest(serviceId, reason);

      const service = await serviceRepo.findById(serviceId);

      // Emit socket event
      io.to(`service:${serviceId}`).emit("service.updated", { id: serviceId, contested: true });

      if (service && service.provider_id) {
        const tmpl = TEMPLATES.SERVICE_CONTESTED();
        notificationManager.send(
          Number(service.provider_id),
          "service_contested",
          serviceId,
          tmpl.title,
          tmpl.body,
          { service_id: serviceId, reason }
        ).catch(console.error);
      }

      res.json({ success: true, message: "Contest opened" });
    } catch (error) {
      logger.error("services.contest", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.post(
  "/:id/contest/evidence",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      const { type, key } = req.body; // type: 'image' | 'video' | 'audio'
      const serviceId = req.params.id;

      if (!type || !key) {
        res.status(400).json({ success: false, message: "Type and key required" });
        return;
      }

      await serviceRepo.addContestEvidence(serviceId, { type, key });

      // Emit socket event
      io.to(`service:${serviceId}`).emit("service.contest_evidence", { serviceId, type, key });

      res.json({ success: true, message: "Evidence added" });
    } catch (error) {
      logger.error("services.contest.evidence", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Provider Arrived
router.post(
  "/:id/provider-arrived",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "provider") {
        res.status(403).json({
          success: false,
          message: "Only providers can signal arrival",
        });
        return;
      }

      const service = await serviceRepo.findById(req.params.id);
      if (!service) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      if (service.provider_id !== user.id) {
        res.status(403).json({
          success: false,
          message: "You are not the assigned provider",
        });
        return;
      }

      // Notify Client
      const tmpl = TEMPLATES.PROVIDER_ARRIVED();
      const providerName = user.full_name || "O prestador";
      // Customize body?
      // const body = `${providerName} chegou ao local.`; 
      // Using template body for consistency or override
      const body = tmpl.body;

      await notificationManager.send(
        Number(service.client_id),
        "provider_arrived",
        req.params.id,
        tmpl.title,
        body,
        { service_id: req.params.id },
      );

      res.json({ success: true, message: "Arrival notified" });
    } catch (error) {
      logger.error("services.provider_arrived", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Client Arrived
router.post(
  "/:id/client-arrived",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (user?.role !== "client") {
        res.status(403).json({
          success: false,
          message: "Only clients can signal arrival",
        });
        return;
      }

      const service = await serviceRepo.findById(req.params.id);
      if (!service) {
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      if (service.client_id !== user.id) {
        res.status(403).json({
          success: false,
          message: "You are not the client of this service",
        });
        return;
      }

      if (service.provider_id) {
        // Notify Provider
        const tmpl = TEMPLATES.CLIENT_ARRIVED();
        // const clientName = user.full_name || "O cliente";
        const body = tmpl.body;

        await notificationManager.send(
          Number(service.provider_id),
          "client_arrived",
          req.params.id,
          tmpl.title,
          body,
          { service_id: req.params.id },
        );
      }

      res.json({ success: true, message: "Arrival notified" });
    } catch (error) {
      logger.error("services.client_arrived", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

export default router;
const teachSchema = z
  .object({
    text: z.string().min(6),
    profession_id: z.number().optional(),
    profession_name: z.string().optional(),
    category_id: z.number().optional(),
  })
  .refine((d) => !!d.profession_id || !!d.profession_name, {
    message: "profession_id or profession_name required",
  });

router.post(
  "/ai/teach",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const data = teachSchema.parse(req.body);
      let pid = data.profession_id || 0;
      if (!pid && data.profession_name) {
        const [pRows] = (await pool.query(
          "SELECT id FROM professions WHERE name = ? LIMIT 1",
          [data.profession_name],
        )) as [RowDataPacket[], FieldPacket[]];
        const pArr = Array.isArray(pRows) ? pRows : [];
        pid = pArr.length ? Number(pArr[0].id) : 0;
      }
      if (!pid) {
        res.status(400).json({ success: false, message: "Invalid profession" });
        return;
      }
      await pool.query(
        "INSERT INTO ai_training_examples (profession_id, category_id, text) VALUES (?, ?, ?)",
        [pid, data.category_id || null, data.text.trim()],
      );
      await clearCache();
      res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues });
      } else {
        logger.error("services.ai.teach", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  },
);

// Remove a profession from the system
router.delete(
  "/professions/:id",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin/provider
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const professionId = Number(req.params.id);

      // Check if profession exists
      const [profRows] = (await pool.query(
        "SELECT id FROM professions WHERE id = ?",
        [professionId],
      )) as [RowDataPacket[], FieldPacket[]];
      const profList = Array.isArray(profRows) ? profRows : [];

      if (profList.length === 0) {
        res
          .status(404)
          .json({ success: false, message: "Profession not found" });
        return;
      }

      // Remove profession associations first
      await pool.query(
        "DELETE FROM provider_professions WHERE profession_id = ?",
        [professionId],
      );
      await pool.query(
        "DELETE FROM ai_training_examples WHERE profession_id = ?",
        [professionId],
      );

      // Remove the profession itself
      await pool.query("DELETE FROM professions WHERE id = ?", [professionId]);

      // Clear the embeddings cache
      clearCache();

      res.json({ success: true, message: "Profession removed successfully" });
    } catch (error) {
      logger.error("services.professions.remove", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.delete(
  "/professions",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM provider_professions");
        await conn.query("DELETE FROM ai_training_examples");
        await conn.query("DELETE FROM task_catalog");
        await conn.query("DELETE FROM professions");
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      clearCache();
      res.json({ success: true, message: "All professions removed" });
    } catch (error) {
      logger.error("services.professions.remove_all", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

const bulkProfSchema = z.array(
  z.object({
    name: z.string().min(2),
    category_id: z.number().optional(),
    icon: z.string().optional(),
    keywords: z.string().optional(),
    popularity_score: z.number().min(0).max(100).optional(),
  }),
);

router.post(
  "/professions/bulk",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      const items = bulkProfSchema.parse(req.body);
      if (!items.length) {
        res.status(400).json({ success: false, message: "Empty list" });
        return;
      }
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const it of items) {
          await conn.query(
            "INSERT INTO professions (name, category_id, icon, keywords, search_vector, popularity_score) VALUES (?, ?, ?, ?, ?, ?)",
            [
              String(it.name),
              it.category_id ?? null,
              it.icon ?? null,
              it.keywords ?? null,
              null,
              it.popularity_score ?? 0,
            ],
          );
        }
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
      clearCache();
      res.status(201).json({ success: true, count: items.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.issues });
      } else {
        logger.error("services.professions.bulk", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    }
  },
);

// Remove a profession from a specific category (without deleting the profession entirely)
router.delete(
  "/categories/:categoryId/professions/:professionId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin/provider
      const user = (req as AuthRequest).user;
      if (!user || user.role !== "provider") {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const categoryId = Number(req.params.categoryId);
      const professionId = Number(req.params.professionId);

      // Check if category exists
      const [catRows] = (await pool.query(
        "SELECT id FROM service_categories WHERE id = ?",
        [categoryId],
      )) as [RowDataPacket[], FieldPacket[]];
      const catList = Array.isArray(catRows) ? catRows : [];

      if (catList.length === 0) {
        res.status(404).json({ success: false, message: "Category not found" });
        return;
      }

      // Check if profession exists
      const [profRows] = (await pool.query(
        "SELECT id FROM professions WHERE id = ?",
        [professionId],
      )) as [RowDataPacket[], FieldPacket[]];
      const profList = Array.isArray(profRows) ? profRows : [];

      if (profList.length === 0) {
        res
          .status(404)
          .json({ success: false, message: "Profession not found" });
        return;
      }

      // Remove AI training examples linking this profession to this category
      await pool.query(
        "DELETE FROM ai_training_examples WHERE profession_id = ? AND category_id = ?",
        [professionId, categoryId],
      );

      // Clear the embeddings cache
      clearCache();

      res.json({
        success: true,
        message: "Profession removed from category successfully",
      });
    } catch (error) {
      logger.error("services.categories.professions.remove", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Get all categories
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const [rows] = (await pool.query(
      "SELECT id, name, icon_slug FROM service_categories ORDER BY name ASC",
    )) as [RowDataPacket[], FieldPacket[]];
    const categories = Array.isArray(rows) ? rows : [];
    res.json({ success: true, categories });
  } catch (error) {
    logger.error("services.categories.list", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get professions by category
router.get(
  "/categories/:id/professions",
  async (req: Request, res: Response) => {
    try {
      const categoryId = Number(req.params.id);

      // Check if category exists
      const [catRows] = (await pool.query(
        "SELECT id FROM service_categories WHERE id = ?",
        [categoryId],
      )) as [RowDataPacket[], FieldPacket[]];
      const catList = Array.isArray(catRows) ? catRows : [];

      if (catList.length === 0) {
        res.status(404).json({ success: false, message: "Category not found" });
        return;
      }

      // Get professions for this category
      const [profRows] = (await pool.query(
        `
            SELECT DISTINCT p.id, p.name 
            FROM professions p 
            JOIN ai_training_examples ate ON p.id = ate.profession_id 
            WHERE ate.category_id = ? 
            ORDER BY p.name ASC
        `,
        [categoryId],
      )) as [RowDataPacket[], FieldPacket[]];

      const professions = Array.isArray(profRows) ? profRows : [];

      res.json({ success: true, professions });
    } catch (error) {
      logger.error("services.categories.professions.list", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);
