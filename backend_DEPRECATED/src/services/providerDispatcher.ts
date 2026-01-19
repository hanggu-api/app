import prisma from "../database/prisma";
import { notificationManager } from "../notifications/manager";
import { io } from "../platform";
import { ServiceRepository } from "../repositories/serviceRepository";
import { DISPATCH_TIMEOUT_MS, MAX_DISPATCH_CYCLES } from "../utils/config";
import logger from "../utils/logger";
import { FirebaseService } from "./firebase_service";
import { providerRulesService } from "./providerRules";
import { Prisma } from "@prisma/client";

interface DispatchRecord {
  service_id: string;
  current_cycle: number;
  current_provider_index: number;
  provider_list: number[];
  status: string;
  last_attempt_at: Date | null;
  next_retry_at: Date | null;
  history: any[];
}

class ProviderDispatcher {
  private serviceRepo = new ServiceRepository();
  private activeTimers = new Map<string, NodeJS.Timeout>();

  async startDispatch(serviceId: string) {
    try {
      const existing = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId, status: 'active' }
      });
      if (existing) {
        logger.info(`Dispatcher: Dispatch already active for service ${serviceId}`);
        return;
      }

      const service = await this.serviceRepo.findById(serviceId);
      if (!service) {
        logger.error(`Dispatcher: Service ${serviceId} not found`);
        return;
      }

      // Check if dispatch already exists
      const existingDispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });

      if (existingDispatch) {
        await prisma.service_dispatches.update({
          where: { id: existingDispatch.id },
          data: {
            status: 'active',
            current_cycle: 1,
            current_provider_index: 0,
            history: []
          }
        });
      } else {
        await prisma.service_dispatches.create({
          data: {
            service_id: serviceId,
            provider_list: [],
            status: 'active',
            current_cycle: 1,
            current_provider_index: 0,
            history: []
          }
        });
      }

      let candidates: number[] = [];
      if (service.provider_id) {
        candidates = [Number(service.provider_id)];
      } else {
        const prof = await prisma.professions.findFirst({
          where: { name: service.profession || '' }
        });
        candidates = await this.serviceRepo.findProvidersByDistance(
          Number(service.latitude),
          Number(service.longitude),
          service.category_id,
          prof?.id,
          serviceId
        );
        candidates = await providerRulesService.filterAvailableProviders(candidates);
      }

      if (candidates.length === 0) {
        logger.info(`Dispatcher: No providers found for service ${serviceId}`);
        return;
      }

      const dispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });
      if (dispatch) {
        await prisma.service_dispatches.update({
          where: { id: dispatch.id },
          data: { provider_list: candidates }
        });
      }

      await this.notifyCurrent(serviceId);
    } catch (error) {
      logger.error("Dispatcher.startDispatch", error);
    }
  }

  private async getDispatchRecord(serviceId: string): Promise<DispatchRecord | null> {
    const r = await prisma.service_dispatches.findFirst({
      where: { service_id: serviceId }
    });
    if (!r) return null;
    return {
      service_id: r.service_id,
      current_cycle: r.current_cycle,
      current_provider_index: r.current_provider_index,
      provider_list: r.provider_list as number[],
      status: r.status,
      last_attempt_at: r.last_attempt_at,
      next_retry_at: r.next_retry_at,
      history: r.history as any[]
    };
  }

  private async notifyCurrent(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    const providerId = record.provider_list[record.current_provider_index];
    if (!providerId) {
      this.next(serviceId);
      return;
    }

    const isAvailable = await providerRulesService.isProviderAvailable(providerId);
    if (!isAvailable) {
      this.next(serviceId);
      return;
    }

    try {
      const service = await this.serviceRepo.findById(serviceId);
      if (!service) {
        await this.cancelDispatch(serviceId, 'cancelled_orphan');
        return;
      }

      // Check if provider already rejected this service (Double check for cycles)
      const rejection = await prisma.service_rejections.findUnique({
        where: {
          service_id_provider_id: {
            service_id: serviceId,
            provider_id: providerId
          }
        }
      });

      if (rejection) {
        logger.info(`Dispatcher: Skipping provider ${providerId} (previously rejected)`);
        this.next(serviceId);
        return;
      }

      const commissionRate = 0.15;
      const grossPrice = Number(service.price_estimated || 0);
      const netPrice = grossPrice * (1 - commissionRate);

      const servicePayload = {
        ...service,
        price_estimated: netPrice.toFixed(2),
        original_price: grossPrice.toFixed(2)
      };

      io.to(`user:${providerId}`).emit("service.offered", {
        service_id: serviceId,
        service: servicePayload,
        timeout_ms: DISPATCH_TIMEOUT_MS,
        cycle: record.current_cycle,
      });

      await FirebaseService.sendUserEvent(providerId, "service.offered", {
        service_id: serviceId,
        service: servicePayload,
        timeout_ms: DISPATCH_TIMEOUT_MS,
        cycle: record.current_cycle,
      });

      // Check if service is scheduled
      const isScheduled = service.status === 'scheduled' && service.scheduled_at;
      let notificationTitle = "101 Service: Novo Pedido";
      let notificationBody = `Cliente precisa de ${service.profession || 'serviço'}. Toque para aceitar!`;

      if (isScheduled) {
        // Format scheduled date/time
        const scheduledDate = new Date(service.scheduled_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());

        const timeStr = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;

        let dateStr = '';
        if (targetDate.getTime() === today.getTime()) {
          dateStr = `Hoje às ${timeStr}`;
        } else if (targetDate.getTime() === tomorrow.getTime()) {
          dateStr = `Amanhã às ${timeStr}`;
        } else {
          const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          const dayName = days[scheduledDate.getDay()];
          const dateFormatted = `${scheduledDate.getDate().toString().padStart(2, '0')}/${(scheduledDate.getMonth() + 1).toString().padStart(2, '0')}`;
          dateStr = `${dayName} ${dateFormatted} às ${timeStr}`;
        }

        notificationTitle = "📅 Serviço Agendado";
        notificationBody = `Serviço agendado para ${dateStr}. Toque para aceitar!`;
      }

      await notificationManager.send(
        providerId,
        "new_service",
        serviceId,
        notificationTitle,
        notificationBody,
        { service_id: serviceId, type: "new_service", id: serviceId, timeout_ms: DISPATCH_TIMEOUT_MS },
      );

      const dispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });
      if (dispatch) {
        await prisma.service_dispatches.update({
          where: { id: dispatch.id },
          data: { last_attempt_at: new Date() }
        });
      }

      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
      }

      const timer = setTimeout(() => {
        this.handleTimeout(serviceId, providerId);
      }, DISPATCH_TIMEOUT_MS);

      this.activeTimers.set(serviceId, timer);
    } catch (error) {
      logger.error(`Dispatcher.notifyCurrent error`, error);
    }
  }

  private async handleTimeout(serviceId: string, providerId: number) {
    await this.logHistory(serviceId, providerId, "timeout");
    await this.next(serviceId);
  }

  private async logHistory(serviceId: string, providerId: number, action: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record) return;

    const entry = {
      provider_id: providerId,
      cycle: record.current_cycle,
      action: action,
      timestamp: new Date().toISOString(),
    };

    const history = [...(record.history || []), entry];

    const dispatch = await prisma.service_dispatches.findFirst({
      where: { service_id: serviceId }
    });
    if (dispatch) {
      await prisma.service_dispatches.update({
        where: { id: dispatch.id },
        data: { history: history as Prisma.JsonArray }
      });
    }
  }

  private async next(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    let nextIndex = record.current_provider_index + 1;
    let nextCycle = record.current_cycle;

    if (nextIndex >= record.provider_list.length) {
      nextIndex = 0;
      nextCycle++;
    }

    if (nextCycle > MAX_DISPATCH_CYCLES) {
      const retryAt = new Date();
      retryAt.setMinutes(retryAt.getMinutes() + 10);

      const dispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });
      if (dispatch) {
        await prisma.service_dispatches.update({
          where: { id: dispatch.id },
          data: { status: 'failed', next_retry_at: retryAt }
        });
      }

      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
        this.activeTimers.delete(serviceId);
      }
      return;
    }

    const dispatch = await prisma.service_dispatches.findFirst({
      where: { service_id: serviceId }
    });
    if (dispatch) {
      await prisma.service_dispatches.update({
        where: { id: dispatch.id },
        data: { current_cycle: nextCycle, current_provider_index: nextIndex }
      });
    }

    await this.notifyCurrent(serviceId);
  }

  async reject(serviceId: string, providerId: number) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    if (record.provider_list[record.current_provider_index] === providerId) {
      // 1. Persist Rejection
      try {
        await prisma.service_rejections.create({
          data: {
            service_id: serviceId,
            provider_id: providerId
          }
        });
      } catch (e) {
        // Ignore duplicate key errors if already rejected
        logger.warn(`Provider ${providerId} already rejected service ${serviceId}`);
      }

      // 2. Clear timer and move next
      if (this.activeTimers.has(serviceId)) clearTimeout(this.activeTimers.get(serviceId)!);
      await this.logHistory(serviceId, providerId, "reject");
      await this.next(serviceId);
    }
  }

  async stopDispatch(serviceId: string) {
    if (this.activeTimers.has(serviceId)) {
      clearTimeout(this.activeTimers.get(serviceId)!);
      this.activeTimers.delete(serviceId);
    }
    const dispatch = await prisma.service_dispatches.findFirst({
      where: { service_id: serviceId }
    });
    if (dispatch) {
      await prisma.service_dispatches.update({
        where: { id: dispatch.id },
        data: { status: 'completed' }
      });
    }
  }

  async cancelDispatch(serviceId: string, reason: string = 'cancelled') {
    if (this.activeTimers.has(serviceId)) {
      clearTimeout(this.activeTimers.get(serviceId)!);
      this.activeTimers.delete(serviceId);
    }
    const dispatch = await prisma.service_dispatches.findFirst({
      where: { service_id: serviceId }
    });
    if (dispatch) {
      await prisma.service_dispatches.update({
        where: { id: dispatch.id },
        data: { status: reason }
      });

      // Notify all providers that the service is cancelled
      io.emit("service.cancelled", { service_id: serviceId });

      // Also notify via Firebase for mobile apps
      if (dispatch.provider_list && Array.isArray(dispatch.provider_list)) {
        const providers = dispatch.provider_list as number[];
        for (const providerId of providers) {
          await FirebaseService.sendUserEvent(providerId, "service.cancelled", {
            service_id: serviceId
          });
        }
      }
    }
  }

  async recover() {
    try {
      const active = await prisma.service_dispatches.findMany({ where: { status: 'active' } });
      for (const row of active) {
        const elapsed = Date.now() - new Date(row.last_attempt_at || 0).getTime();
        if (elapsed >= DISPATCH_TIMEOUT_MS) {
          this.handleTimeout(row.service_id, (row.provider_list as number[])[row.current_provider_index]);
        } else {
          const timer = setTimeout(() => {
            this.handleTimeout(row.service_id, (row.provider_list as number[])[row.current_provider_index]);
          }, DISPATCH_TIMEOUT_MS - elapsed);
          this.activeTimers.set(row.service_id, timer);
        }
      }
    } catch (error) {
      logger.error("Dispatcher.recover error", error);
    }
  }
}

export const providerDispatcher = new ProviderDispatcher();
