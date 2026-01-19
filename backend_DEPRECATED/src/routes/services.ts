import { Request, Response, Router } from "express";
import * as admin from "firebase-admin";
import { z } from "zod";
import { classifyText, clearCache, findBestTask } from "../ai/aiConnector";
import { generateTasks as aiGenerateTasks } from "../ai/tasks";
import prisma from "../database/prisma";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { notificationManager, TEMPLATES } from "../notifications/manager";
import { io } from "../platform";
import { auditRepository } from "../repositories/auditRepository";
import { serviceRepository } from "../repositories/serviceRepository";
import { providerDispatcher } from "../services/providerDispatcher";
import logger from "../utils/logger";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/professions", async (req, res) => {
  try {
    // Fetch Professions + Linked Tasks from Database
    const professionsWithTasks = await prisma.professions.findMany({
      orderBy: { name: 'asc' },
      include: {
        task_catalog: {
          where: { active: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    const structure: Record<string, any[]> = {};

    for (const prof of professionsWithTasks) {
      // Map tasks to the expected format
      const tasks = prof.task_catalog.map(t => ({
        id: t.id,
        name: t.name,
        price: Number(t.unit_price) || 0.0, // Convert Decimal to Number
        unit: t.unit_name
      }));

      // Always include the profession, even if task list is empty
      // This ensures it appears in the first autocomplete
      structure[prof.name] = tasks;
    }

    res.json(structure);
  } catch (error) {
    console.error("Error fetching professions from DB:", error);
    res.status(500).json({ error: "Failed to fetch professions" });
  }
});

router.get("/professions/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await prisma.task_catalog.findMany({
      where: { profession_id: Number(id), active: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching tasks" });
  }
});

// Mark provider arrived
router.post("/:id/arrived", async (req, res) => {
  const { id } = req.params;
  try {
    await serviceRepository.markArrived(id);

    // Notify client
    const service = await serviceRepository.findById(id);
    if (service && service.client_id) {
      await notificationManager.send(Number(service.client_id), 'service_update', id, 'Prestador Chegou', 'O prestador chegou ao local.', { service_id: id, status: 'arrived' });
    }

    io.to(`service:${id}`).emit("service.updated", { id, arrived_at: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark arrived" });
  }
});

// Mark CLIENT departing (Fixed Location)
router.post("/:id/depart", async (req, res) => {
  const { id } = req.params;
  try {
    await serviceRepository.updateStatus(id, "client_departing");

    logger.info(`[Service] Client departed for service ${id}`);

    // Notify provider
    const service = await serviceRepository.findById(id);
    if (service && service.provider_id) {
      await notificationManager.send(
        Number(service.provider_id),
        'client_departing',
        id,
        'Cliente a Caminho',
        'O cliente informou que está indo ao seu local.',
        { service_id: id, status: 'client_departing' }
      );

      io.to(`user:${service.provider_id}`).emit('service.updated', {
        id,
        status: 'client_departing',
        updated_at: new Date()
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark departing" });
  }
});

// Mark CLIENT arrived (Fixed Location)
router.post("/:id/arrived_client", async (req, res) => {
  const { id } = req.params;
  logger.info(`🚨 [Service] REQUEST: Mark Client Arrived for service ${id}`);
  try {
    const serviceBefore = await serviceRepository.findById(id);
    logger.info(`🚨 [Service] Status BEFORE update: ${serviceBefore?.status}`);

    await serviceRepository.updateStatus(id, "client_arrived");

    logger.info(`🚨 [Service] DB Update OK for ${id}`);

    const serviceAfter = await serviceRepository.findById(id);
    logger.info(`🚨 [Service] Status AFTER update: ${serviceAfter?.status}`);

    // Also mark arrived_at timestamp if not set? Maybe separate field client_arrived_at? 
    // For now, let's just use the status.

    const service = await serviceRepository.findById(id);
    if (service && service.provider_id) {
      await notificationManager.send(
        Number(service.provider_id),
        'client_arrived',
        id,
        'Cliente Chegou',
        'O cliente chegou ao seu local.',
        { service_id: id, status: 'client_arrived' }
      );

      io.to(`user:${service.provider_id}`).emit('service.updated', {
        id,
        status: 'client_arrived',
        client_arrived: true, // Legacy support
        updated_at: new Date()
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to notify client arrival" });
  }
});

router.post("/ai/classify", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const result = await classifyText(text);

    if (result.id === 0) {
      const professions = await prisma.professions.findMany({
        where: { name: { contains: text, mode: 'insensitive' } },
        include: { service_categories: true }
      });

      if (professions.length > 0) {
        const p = professions[0];
        return res.json({
          encontrado: true,
          id: p.id,
          profissao: p.name,
          categoria_id: p.category_id,
          categoria: p.service_categories?.name,
          service_type: p.service_type,
          confianca: 0.9,
          task: null
        });
      }

      // If no professions found, try searching task_catalog
      const tasks = await prisma.task_catalog.findMany({
        where: { name: { contains: text, mode: 'insensitive' } },
        include: { professions: { include: { service_categories: true } } }
      });

      if (tasks.length > 0) {
        const t = tasks[0];
        const p = t.professions;
        return res.json({
          encontrado: true,
          id: p?.id,
          profissao: p?.name,
          categoria_id: p?.category_id,
          categoria: p?.service_categories?.name,
          service_type: p?.service_type,
          confianca: 0.85,
          task: {
            id: t.id,
            name: t.name,
            unit_price: t.unit_price,
            pricing_type: t.pricing_type
          }
        });
      }
    }

    // Map the result to what the mobile app expects
    const mappedResponse = {
      encontrado: result.id > 0,
      id: result.id,
      profissao: result.name,
      categoria: result.category_name,
      categoria_id: result.category_id,
      confianca: result.score,
      service_type: result.service_type,
      task: result.task_id ? {
        id: result.task_id,
        name: result.task_name,
        unit_price: result.price,
        pricing_type: result.pricing_type,
        unit_name: result.unit_name
      } : null,
      candidates: result.candidates
    };

    res.json(mappedResponse);

  } catch (error) {
    logger.error("Error in /classify", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // D1 (SQLite) complains if it receives explicit "undefined" values.
    // Clean up the payload before sending to Prisma.
    const payload = { ...req.body };
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const serviceId = await serviceRepository.create({
      ...payload,
      client_id: req.user!.id,
    });

    const service = await serviceRepository.findById(serviceId);

    await auditRepository.log({
      user_id: Number(req.user!.id),
      action: "create_service",
      entity_type: "service_requests",
      entity_id: serviceId,
      details: { category_id: req.body.category_id }
    });

    res.status(201).json({ success: true, serviceId, service });
  } catch (error) {
    logger.error("Error creating service", error);
    res.status(500).json({ success: false, message: "Error creating service" });
  }
});

router.get("/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const services = await serviceRepository.getServiceHistory(req.user!.id, req.user!.role as any);

    // Filter only active services? No, return all for tabs to handle
    const activeServices = services; // Return all services including completed/cancelled

    console.log(`[GET /my] User ${req.user!.id} (${req.user!.role}) - Found ${activeServices.length} active services`);
    if (activeServices.length > 0) {
      console.log(`[GET /my] First service ID: ${activeServices[0].id}, Status: ${activeServices[0].status}, Code: ${activeServices[0].completion_code}`);
    }

    res.json({ success: true, services: activeServices });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching services" });
  }
});

router.get("/available", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const services = await serviceRepository.findAvailable();
    res.json({ success: true, services });
  } catch (error) {
    console.error("[ERROR] /services/available:", error);
    res.status(500).json({ success: false, message: "Error fetching available services" });
  }
});

router.get("/my-services", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const services = await serviceRepository.getServiceHistory(req.user!.id, req.user!.role as any);
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching services" });
  }
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const service = await serviceRepository.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Not found" });

    // Security: Hide completion_code from provider to prevent bypassing verification
    if (req.user!.role === 'provider' && String(service.provider_id) === String(req.user!.id)) {
      (service as any).completion_code = undefined;
    }

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching service" });
  }
});

router.post("/:id/accept", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = req.user!.id;

    // Check if service exists
    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Accept service
    await serviceRepository.acceptService(id, providerId);
    await providerDispatcher.stopDispatch(id);

    // Notify Client via FCM
    if (service.client_id) {
      notificationManager.send(Number(service.client_id), 'service_accepted', id, 'Serviço Aceito', 'Um prestador aceitou seu pedido!', { serviceId: id });
    }

    // Notify Client via Socket.IO (Real-time UI Update)
    const socketPayload = {
      id,
      service_id: id,
      status: 'accepted',
      provider_id: providerId,
      updated_at: new Date().toISOString()
    };

    // Broadcast to specific user and service room
    io.to(`user:${service.client_id}`).emit('service.status', socketPayload);
    io.to(`service:${id}`).emit('service.status', socketPayload);

    res.json({ success: true });
  } catch (error) {
    logger.error("Error accepting service", error);
    res.status(500).json({ success: false, message: "Error accepting service" });
  }
});

router.post("/:id/reject", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = req.user!.id;

    await providerDispatcher.reject(id, Number(providerId));
    res.json({ success: true });
  } catch (error) {
    logger.error("Error rejecting service", error);
    res.status(500).json({ success: false, message: "Error rejecting service" });
  }
});

router.post("/:id/start", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await serviceRepository.updateStatus(id, "in_progress");

    const service = await serviceRepository.findById(id);
    if (service?.client_id) {
      notificationManager.send(Number(service.client_id), 'service_started', id, 'Serviço Iniciado', 'O prestador iniciou o serviço.', { serviceId: id });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error starting service" });
  }
});

router.post("/:id/arrive", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = req.user!.id;

    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Verify authorization
    if (String(service.provider_id) !== String(providerId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Update DB: Mark as arrived and set status
    await serviceRepository.markArrived(id);
    await serviceRepository.updateStatus(id, "waiting_payment_remaining");

    // Notify Client
    if (service.client_id) {
      notificationManager.send(
        Number(service.client_id),
        'provider_arrived',
        id,
        'Prestador Chegou!',
        'O prestador está aguardando sua confirmação.',
        { serviceId: id }
      );
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Error notifying arrival", error);
    res.status(500).json({ success: false, message: "Error notifying arrival" });
  }
});

router.post("/:id/cancel", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const service = await serviceRepository.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    if (['accepted', 'in_progress', 'waiting_payment_remaining', 'completed'].includes(service.status || '')) {
      return res.status(400).json({ success: false, message: "Não é possível cancelar um serviço aceito ou em andamento." });
    }

    await serviceRepository.updateStatus(req.params.id, "cancelled");
    await providerDispatcher.cancelDispatch(req.params.id, "cancelled_by_user");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error cancelling service" });
  }
});

router.post("/:id/request-completion", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = req.user!.id;

    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Verify authorization
    if (String(service.provider_id) !== String(providerId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (service.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: "Service must be in progress to request completion" });
    }

    // Generate code and update status
    const result = await serviceRepository.requestCompletion(id);

    // Notify Client
    if (service.client_id) {
      // Send Push Notification
      await notificationManager.send(
        Number(service.client_id),
        'completion_requested',
        id,
        'Confirmação de Conclusão',
        'O prestador solicitou a conclusão. Informe o código exibido para ele.',
        { serviceId: id }
      );

      // Emit Socket event to update UI immediately
      io.to(`user:${service.client_id}`).emit('completion_requested', {
        service_id: id,
        id: id,
        status: 'awaiting_confirmation'
      });

      // Redundancy: Update Firestore via 'service.updated' event
      io.to(`service:${id}`).emit('service.updated', {
        status: 'awaiting_confirmation',
        updated_at: new Date().toISOString()
      });
    }

    res.json({ success: true, message: "Completion requested" });
  } catch (error) {
    logger.error("Error requesting completion", error);
    res.status(500).json({ success: false, message: "Error requesting completion" });
  }
});

router.post("/:id/verify-code", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) return res.status(400).json({ success: false, message: "Code required" });

    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    const isValid = service.completion_code === code;
    res.json({ success: true, isValid });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error verifying code" });
  }
});

router.post("/:id/confirm-completion", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, proof_video } = req.body;
    const providerId = req.user!.id;

    if (!code) return res.status(400).json({ success: false, message: "Confirmation code required" });

    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Verify authorization
    if (String(service.provider_id) !== String(providerId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const success = await serviceRepository.confirmCompletion(id, code, proof_video);

    if (success) {
      // Notify Client
      if (service.client_id) {
        notificationManager.send(
          Number(service.client_id),
          'service_completed',
          id,
          'Serviço Concluído',
          'O serviço foi concluído com sucesso. Obrigado!',
          { serviceId: id }
        );
      }
      res.json({ success: true, message: "Service completed successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid confirmation code" });
    }
  } catch (error) {
    logger.error("Error confirming completion", error);
    res.status(500).json({ success: false, message: "Error confirming completion" });
  }
});

router.post("/:id/confirm-payment", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = req.user!.id;

    const service = await serviceRepository.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    // Verify authorization
    if (String(service.provider_id) !== String(providerId)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Update status to completed + payment confirmed
    await prisma.service_requests.update({
      where: { id },
      data: {
        status: 'completed',
        payment_remaining_status: 'paid_manual',
        completed_at: new Date(),
        status_updated_at: new Date()
      }
    });

    logger.info(`[Service] Payment manually confirmed for service ${id} by provider ${providerId}`);

    // Notify Client
    if (service.client_id) {
      await notificationManager.send(
        Number(service.client_id),
        'payment_confirmed',
        id,
        'Pagamento Confirmado',
        'O prestador confirmou o recebimento. Serviço concluído!',
        { service_id: id, status: 'completed' }
      );

      io.to(`user:${service.client_id}`).emit('service.updated', {
        id,
        status: 'completed',
        updated_at: new Date()
      });
    }

    res.json({ success: true, message: "Payment confirmed and service completed" });
  } catch (error) {
    logger.error("Error confirming payment", error);
    res.status(500).json({ success: false, message: "Error confirming payment" });
  }
});

router.post("/:id/review", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const clientId = BigInt(req.user!.id);

    if (!rating) return res.status(400).json({ success: false, message: "Rating required" });

    const review = await serviceRepository.submitReview(id, clientId, Number(rating), comment);

    // Notificar via Socket para atualizar UI em tempo real
    io.to(`service:${id}`).emit('service.updated', { id, status: 'completed' });

    res.json({ success: true, review });
  } catch (error: any) {
    logger.error("Error submitting review", error);
    res.status(500).json({ success: false, message: error.message || "Error submitting review" });
  }
});

export default router;
