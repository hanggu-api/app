import pool from "../database/db";
import { notificationManager } from "../notifications/manager";
import { io } from "../platform";
import { ServiceRepository } from "../repositories/serviceRepository";
import { DISPATCH_TIMEOUT_MS, MAX_DISPATCH_CYCLES } from "../utils/config";
import logger from "../utils/logger";
import { FirebaseService } from "./firebase_service";

interface DispatchRecord {
  service_id: string;
  current_cycle: number;
  current_provider_index: number;
  provider_list: number[];
  status: "active" | "paused" | "completed" | "failed";
  last_attempt_at: Date | null;
  next_retry_at: Date | null;
  history: any[];
}

class ProviderDispatcher {
  private serviceRepo = new ServiceRepository();
  private activeTimers = new Map<string, NodeJS.Timeout>();

  async startDispatch(serviceId: string) {
    try {
      // 1. Check if dispatch already exists
      const [rows]: any = await pool.query(
        'SELECT * FROM service_dispatches WHERE service_id = ? AND status = "active"',
        [serviceId],
      );
      if (rows.length > 0) {
        logger.info(
          `Dispatcher: Dispatch already active for service ${serviceId}`,
        );
        // If needed, resume logic here (e.g. check if timeout passed)
        // For now, we assume if it's in DB but no timer in memory, we might need to kickstart it.
        // But for this simplified version, let's just proceed to create or restart if failed.
        return;
      }

      // 2. Get Service Details
      const service = await this.serviceRepo.findById(serviceId);
      if (!service) {
        logger.error(`Dispatcher: Service ${serviceId} not found`);
        return;
      }

      // 3. Find Candidates (Sorted by Distance)
      let professionId: number | undefined = undefined;
      if (service.profession) {
        const [pRows]: any = await pool.query(
          "SELECT id FROM professions WHERE name = ?",
          [service.profession],
        );
        if (pRows.length > 0) {
          professionId = pRows[0].id;
        }
      }

      const candidates = await this.serviceRepo.findProvidersByDistance(
        Number(service.latitude),
        Number(service.longitude),
        service.category_id,
        professionId,
      );

      // FALLBACK: If no candidates found with specific profession, try Category only
      /*
      if (candidates.length === 0 && professionId) {
        logger.info(`Dispatcher: No candidates for profession ${service.profession}, trying category only...`);
        const categoryCandidates = await this.serviceRepo.findProvidersByDistance(
          Number(service.latitude),
          Number(service.longitude),
          service.category_id,
          undefined,
        );
        // Merge without duplicates (though findProvidersByDistance returns unique)
        candidates.push(...categoryCandidates);
      }
      */

      if (candidates.length === 0) {
        logger.info(`Dispatcher: No providers found for service ${serviceId}`);
        // Mark service as 'no_providers' or similar?
        // For now just log.
        return;
      }

      logger.info(
        `Dispatcher: Found ${candidates.length} candidates for service ${serviceId}`,
      );

      // 4. Create Dispatch Record
      await pool.query(
        `INSERT INTO service_dispatches (service_id, provider_list, status, current_cycle, current_provider_index, history)
                 VALUES (?, ?, 'active', 1, 0, '[]')`,
        [serviceId, JSON.stringify(candidates)],
      );

      // 5. Notify First
      await this.notifyCurrent(serviceId);
    } catch (error) {
      logger.error("Dispatcher.startDispatch", error);
    }
  }

  private async getDispatchRecord(
    serviceId: string,
  ): Promise<DispatchRecord | null> {
    const [rows]: any = await pool.query(
      "SELECT * FROM service_dispatches WHERE service_id = ?",
      [serviceId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    // Parse JSON fields
    if (typeof r.provider_list === "string")
      r.provider_list = JSON.parse(r.provider_list);
    if (typeof r.history === "string") r.history = JSON.parse(r.history);
    return r as DispatchRecord;
  }

  private async getConfig() {
    try {
      const [rows]: any = await pool.query(
        "SELECT value FROM system_settings WHERE key_name = 'dispatch_config'"
      );
      if (rows.length > 0) {
        return rows[0].value;
      }
    } catch (e) {
      logger.error("Dispatcher.getConfig error", e);
    }
    // Default fallback
    return { max_declines: 2, cooldown_minutes: 10 };
  }

  private async notifyCurrent(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    const providerId = record.provider_list[record.current_provider_index];
    if (!providerId) {
      // Should not happen if logic is correct, but safe check
      this.next(serviceId);
      return;
    }

    // --- COOLDOWN CHECK START ---
    const config = await this.getConfig();
    const history = record.history || [];
    const providerRejections = history.filter(
      (h: any) => h.provider_id === providerId && h.action === "reject"
    );

    if (providerRejections.length >= config.max_declines) {
      // Check time of last rejection
      const lastRejection = providerRejections[providerRejections.length - 1];
      const lastRejectionTime = new Date(lastRejection.timestamp).getTime();
      const now = Date.now();
      const diffMinutes = (now - lastRejectionTime) / 1000 / 60;

      if (diffMinutes < config.cooldown_minutes) {
        logger.info(
          `Dispatcher: Skipping provider ${providerId} due to cooldown (${diffMinutes.toFixed(1)}m < ${config.cooldown_minutes}m)`
        );
        this.next(serviceId);
        return;
      }
    }
    // --- COOLDOWN CHECK END ---

    logger.info(
      `Dispatcher: Notifying provider ${providerId} for service ${serviceId} (Cycle ${record.current_cycle}, Index ${record.current_provider_index})`,
    );

    try {
      const service = await this.serviceRepo.findById(serviceId);

      if (!service) {
        logger.warn(`Dispatcher: Service ${serviceId} not found in DB. Stopping dispatch.`);
        await this.cancelDispatch(serviceId, 'cancelled_orphan');
        return;
      }

      // Calculate Net Price (Provider Share)
      const commissionRate = parseFloat(process.env.COMMISSION_PERCENT || "0.15");
      const grossPrice = Number(service.price_estimated || 0);
      const netPrice = grossPrice * (1 - commissionRate);

      logger.info(
        `Dispatcher: Pricing for ${serviceId} - Gross: ${grossPrice}, Net: ${netPrice} (Commission: ${commissionRate})`
      );

      // Create payload with net price for provider view
      // We override price_estimated so the existing mobile app displays the net value
      const servicePayload = {
        ...service,
        price_estimated: netPrice.toFixed(2),
        original_price: grossPrice.toFixed(2)
      };

      // 1. Send Socket Event (Targeted)
      io.to(`user:${providerId}`).emit("service.offered", {
        service_id: serviceId,
        service: servicePayload,
        timeout_ms: DISPATCH_TIMEOUT_MS,
        cycle: record.current_cycle,
      });

      // 1.1 Send RTDB Event (for Mobile App)
      await FirebaseService.sendUserEvent(providerId, "service.offered", {
        service_id: serviceId,
        service: servicePayload,
        timeout_ms: DISPATCH_TIMEOUT_MS,
        cycle: record.current_cycle,
      });

      // 2. Send Push Notification
      const title = "101 Service: Novo Pedido";
      // Safety check for profession
      const professionName = (service && service.profession) ? service.profession : "serviço";
      const body = `Cliente precisa de ${professionName}. Toque para aceitar!`;

      await notificationManager.send(
        providerId,
        "new_service", // Changed from "service_offered" to "new_service" for consistency
        serviceId,
        title,
        body,
        { service_id: serviceId, type: "new_service", id: serviceId, timeout_ms: DISPATCH_TIMEOUT_MS }, // Added 'id' and standardized type
      );

      // 3. Update Last Attempt
      await pool.query(
        "UPDATE service_dispatches SET last_attempt_at = NOW() WHERE service_id = ?",
        [serviceId],
      );

      // 4. Start Timeout
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
      }

      const timer = setTimeout(() => {
        this.handleTimeout(serviceId, providerId);
      }, DISPATCH_TIMEOUT_MS);

      this.activeTimers.set(serviceId, timer);
    } catch (error) {
      logger.error(`Dispatcher.notifyCurrent error for ${providerId}`, error);
      // If notification fails, maybe try next?
      // For now let timeout handle it to avoid infinite loops
    }
  }

  private async handleTimeout(serviceId: string, providerId: number) {
    logger.info(
      `Dispatcher: Timeout for service ${serviceId} (Provider ${providerId})`,
    );
    await this.logHistory(serviceId, providerId, "timeout");
    await this.next(serviceId);
  }

  private async logHistory(
    serviceId: string,
    providerId: number,
    action: string,
  ) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record) return;

    const entry = {
      provider_id: providerId,
      cycle: record.current_cycle,
      action: action,
      timestamp: new Date().toISOString(),
    };

    const history = [...(record.history || []), entry];

    await pool.query(
      "UPDATE service_dispatches SET history = ? WHERE service_id = ?",
      [JSON.stringify(history), serviceId],
    );
  }

  private async next(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    let nextIndex = record.current_provider_index + 1;
    let nextCycle = record.current_cycle;

    // Check if we reached end of list
    if (nextIndex >= record.provider_list.length) {
      nextIndex = 0;
      nextCycle++;
    }

    // Check max cycles (3)
    if (nextCycle > MAX_DISPATCH_CYCLES) {
      logger.info(
        `Dispatcher: Max cycles reached for service ${serviceId}. Marking as failed.`,
      );

      // Calculate retry time (30 mins from now)
      const retryAt = new Date();
      retryAt.setMinutes(retryAt.getMinutes() + 30);

      await pool.query(
        `UPDATE service_dispatches 
                 SET status = 'failed', next_retry_at = ? 
                 WHERE service_id = ?`,
        [retryAt, serviceId],
      );

      // Clear timer
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
        this.activeTimers.delete(serviceId);
      }

      // Optionally notify client: "No professionals found, we will try again in 30 mins"
      // And maybe update service status in service_requests table too?
      // await this.serviceRepo.updateStatus(serviceId, 'no_providers');
      // (Assuming 'no_providers' is valid or keep 'pending')

      return;
    }

    // Update DB
    await pool.query(
      "UPDATE service_dispatches SET current_cycle = ?, current_provider_index = ? WHERE service_id = ?",
      [nextCycle, nextIndex, serviceId],
    );

    // Notify next
    await this.notifyCurrent(serviceId);
  }

  // Called when provider rejects explicitly
  async reject(serviceId: string, providerId: number) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== "active") return;

    const currentProvider = record.provider_list[record.current_provider_index];

    // Verify it's the current provider rejecting
    if (currentProvider === providerId) {
      logger.info(
        `Dispatcher: Provider ${providerId} rejected service ${serviceId}`,
      );

      // Clear timer
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
      }

      await this.logHistory(serviceId, providerId, "reject");
      await this.next(serviceId);
    }
  }

  // Called when provider accepts
  async stopDispatch(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (record) {
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
        this.activeTimers.delete(serviceId);
      }

      await pool.query(
        'UPDATE service_dispatches SET status = "completed" WHERE service_id = ?',
        [serviceId],
      );
      logger.info(
        `Dispatcher: Stopped dispatch for service ${serviceId} (Accepted)`,
      );
    }
  }

  // Called to force stop/cancel (e.g. orphan, manual cancel)
  async cancelDispatch(serviceId: string, reason: string = 'cancelled') {
    const record = await this.getDispatchRecord(serviceId);
    if (record) {
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
        this.activeTimers.delete(serviceId);
      }

      await pool.query(
        'UPDATE service_dispatches SET status = ? WHERE service_id = ?',
        [reason, serviceId],
      );
      logger.info(
        `Dispatcher: Cancelled dispatch for service ${serviceId} (Reason: ${reason})`,
      );
    }
  }

  // 🛡️ RECOVERY: Restart stuck dispatches on server restart
  async recover() {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM service_dispatches WHERE status = "active"',
      );

      if (rows.length === 0) return;

      logger.info(`Dispatcher: Found ${rows.length} active dispatches to recover.`);

      for (const row of rows) {
        const serviceId = row.service_id;

        // Check if service still exists
        const service = await this.serviceRepo.findById(serviceId);
        if (!service) {
          logger.warn(`Dispatcher: Service ${serviceId} missing during recovery. Cancelling dispatch.`);
          await this.cancelDispatch(serviceId, 'cancelled_orphan');
          continue;
        }

        const lastAttempt = new Date(row.last_attempt_at || 0);
        const now = new Date();
        const elapsed = now.getTime() - lastAttempt.getTime();
        const timeoutMs = DISPATCH_TIMEOUT_MS;

        if (elapsed >= timeoutMs) {
          // Time expired while server was down -> Trigger timeout immediately
          logger.info(`Dispatcher: Recovering expired dispatch for ${serviceId}`);
          this.handleTimeout(serviceId, row.provider_list[row.current_provider_index]);
        } else {
          // Still has time -> Resume timer
          const remaining = timeoutMs - elapsed;
          logger.info(`Dispatcher: Resuming dispatch for ${serviceId} (${remaining}ms remaining)`);

          if (this.activeTimers.has(serviceId)) {
            clearTimeout(this.activeTimers.get(serviceId)!);
          }

          const timer = setTimeout(() => {
            this.handleTimeout(serviceId, row.provider_list[row.current_provider_index]);
          }, remaining);

          this.activeTimers.set(serviceId, timer);
        }
      }
    } catch (error) {
      logger.error("Dispatcher.recover error", error);
    }
  }
}

export const providerDispatcher = new ProviderDispatcher();
