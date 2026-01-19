import prisma from '../database/prisma';
import { notificationManager } from '../notifications/manager';
import { io } from '../platform';
import { ServiceRepository } from '../repositories/serviceRepository';
import { DISPATCH_TIMEOUT_MS, MAX_DISPATCH_CYCLES } from '../utils/config';
import logger from '../utils/logger';
import { FirebaseService } from './firebase_service';
import { providerRulesService } from './providerRules';
import { providerLocationCache } from './providerLocationCache';
import { refundService } from './refundService';
import { Prisma } from '@prisma/client';

/**
 * ProviderDispatcher (MELHORADO): Dispatch com timeout explícito via Promise.race
 * - Race entre resposta do provider e timeout
 * - Auto-refund se ninguém aceitar
 * - Cleanup automático de timers
 */

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
  private dispatchPromises = new Map<string, Promise<any>>();

  async startDispatch(serviceId: string) {
    try {
      const existing = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId, status: 'active' }
      });
      if (existing) {
        logger.info(`[Dispatcher] Dispatch já ativo para serviço ${serviceId}`);
        return;
      }

      const service = await this.serviceRepo.findById(serviceId);
      if (!service) {
        logger.error(`[Dispatcher] Serviço ${serviceId} não encontrado`);
        return;
      }

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
        
        // Usar cache para melhor performance
        candidates = await providerLocationCache.getNearbyCached(
          Number(service.latitude),
          Number(service.longitude),
          10, // 10km radius
          service.category_id
        );
        
        candidates = candidates
          .map(p => Number(p.id))
          .slice(0, 50); // Top 50 providers
      }

      if (candidates.length === 0) {
        logger.info(`[Dispatcher] Nenhum provider encontrado para serviço ${serviceId}`);
        
        // Auto-refund se ninguém disponível
        await this.handleNoProviderFound(serviceId);
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

      // Iniciar dispatch
      await this.dispatchWithRetry(serviceId);
    } catch (error) {
      logger.error('[Dispatcher] startDispatch error:', error);
    }
  }

  /**
   * Dispatch com retry loop
   */
  private async dispatchWithRetry(serviceId: string) {
    const record = await this.getDispatchRecord(serviceId);
    if (!record || record.status !== 'active') {
      return;
    }

    // Loop pela lista de providers
    while (record.current_provider_index < record.provider_list.length) {
      const providerId = record.provider_list[record.current_provider_index];

      logger.info(
        `[Dispatcher] Tentativa ${record.current_provider_index + 1}/${record.provider_list.length}: ` +
        `Notificando provider ${providerId} para serviço ${serviceId}`
      );

      // Notificar e aguardar resposta COM TIMEOUT EXPLÍCITO
      const result = await this.notifyProviderWithTimeout(
        providerId,
        serviceId,
        DISPATCH_TIMEOUT_MS
      );

      if (result === 'accepted') {
        // Provider aceitou!
        logger.info(`✅ [Dispatcher] Provider ${providerId} aceitou serviço ${serviceId}`);
        return;
      }

      // Provider rejeitou ou timeout
      logger.info(
        `⏭️  [Dispatcher] Provider ${providerId} rejeitou/timeout. ` +
        `Tentando próximo...`
      );

      // Avançar para próximo provider
      record.current_provider_index++;
      
      // Atualizar BD
      const dispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });
      
      if (dispatch) {
        await prisma.service_dispatches.update({
          where: { id: dispatch.id },
          data: {
            current_provider_index: record.current_provider_index,
            updated_at: new Date(),
          }
        });
      }

      // Pequeno delay antes de notificar próximo
      await new Promise(r => setTimeout(r, 3000));
    }

    // Nenhum provider aceitou
    logger.error(
      `❌ [Dispatcher] Nenhum provider encontrado após ${record.provider_list.length} tentativas`
    );
    
    await this.handleNoProviderFound(serviceId);
  }

  /**
   * Notificar provider COM TIMEOUT EXPLÍCITO usando Promise.race
   */
  private async notifyProviderWithTimeout(
    providerId: number,
    serviceId: string,
    timeout: number
  ): Promise<'accepted' | 'rejected' | 'timeout'> {
    try {
      const service = await this.serviceRepo.findById(serviceId);
      if (!service) {
        return 'rejected';
      }

      // Criar promise de timeout
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => {
          logger.warn(
            `[Dispatcher] ⏱️  Timeout após ${timeout}ms para provider ${providerId} ` +
            `no serviço ${serviceId}`
          );
          this.cleanupNotification(providerId, serviceId);
          resolve('timeout');
        }, timeout);
      });

      // Criar promise de resposta do provider
      const responsePromise = this.waitForProviderResponse(
        providerId,
        serviceId
      );

      // Race: quem responder primeiro (provider ou timeout)
      const result = await Promise.race([
        responsePromise,
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      logger.error(
        `[Dispatcher] Erro ao notificar provider ${providerId}: ${error}`
      );
      return 'rejected';
    }
  }

  /**
   * Aguardar resposta do provider via Firebase
   */
  private waitForProviderResponse(
    providerId: number,
    serviceId: string
  ): Promise<'accepted' | 'rejected'> {
    return new Promise((resolve) => {
      // Timeout de segurança (25s, um pouco menos que DISPATCH_TIMEOUT_MS)
      const safetyTimeout = setTimeout(() => {
        ref.off('value', listener);
        resolve('rejected');
      }, 25000);

      const ref = require('firebase-admin')
        .database()
        .ref(`dispatch_responses/${serviceId}/${providerId}`);

      const listener = ref.on('value', (snapshot: any) => {
        if (snapshot.exists()) {
          const { accepted } = snapshot.val();
          clearTimeout(safetyTimeout);
          ref.off('value', listener);
          resolve(accepted === true ? 'accepted' : 'rejected');
        }
      });
    });
  }

  /**
   * Cleanup de notificações expiradas
   */
  private async cleanupNotification(
    providerId: number,
    serviceId: string
  ): Promise<void> {
    try {
      await require('firebase-admin')
        .database()
        .ref(`dispatch/${serviceId}/responses/${providerId}`)
        .remove();

      logger.debug(
        `[Dispatcher] Limpeza: ${providerId} para serviço ${serviceId}`
      );
    } catch (error) {
      logger.error(`[Dispatcher] Cleanup error: ${error}`);
    }
  }

  /**
   * Quando nenhum provider aceita
   */
  private async handleNoProviderFound(serviceId: string): Promise<void> {
    try {
      const service = await this.serviceRepo.findById(serviceId);
      if (!service) return;

      // 1. Marcar como cancelado
      await this.updateServiceStatus(serviceId, 'no_provider_found');

      // 2. Reembolsar cliente se pagou adiantado
      if (service.price_upfront_status === 'paid') {
        logger.info(`[Dispatcher] Reembolsando cliente para serviço ${serviceId}`);
        await refundService.autoRefundNoProvider(serviceId);
      }

      // 3. Notificar cliente
      await this.notifyClientNoProviderFound(service);

      // 4. Cleanup
      await this.cancelDispatch(serviceId, 'no_provider');

      logger.warn(`[Dispatcher] Serviço ${serviceId} cancelado (sem provider)`);
    } catch (error) {
      logger.error(
        `[Dispatcher] Erro ao lidar com "no provider found": ${error}`
      );
    }
  }

  /**
   * Cancelar dispatch
   */
  private async cancelDispatch(
    serviceId: string,
    reason: string
  ): Promise<void> {
    try {
      // Limpar timers
      if (this.activeTimers.has(serviceId)) {
        clearTimeout(this.activeTimers.get(serviceId)!);
        this.activeTimers.delete(serviceId);
      }

      // Limpar promises
      this.dispatchPromises.delete(serviceId);

      // Atualizar BD
      const dispatch = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });

      if (dispatch) {
        await prisma.service_dispatches.update({
          where: { id: dispatch.id },
          data: {
            status: 'cancelled',
            updated_at: new Date(),
          }
        });
      }

      logger.info(
        `[Dispatcher] Dispatch cancelado: ${serviceId} (motivo: ${reason})`
      );
    } catch (error) {
      logger.error(`[Dispatcher] Erro ao cancelar dispatch: ${error}`);
    }
  }

  /**
   * Atualizar status do serviço
   */
  private async updateServiceStatus(
    serviceId: string,
    status: string
  ): Promise<void> {
    try {
      await prisma.service_requests.update({
        where: { id: serviceId },
        data: { status, updated_at: new Date() }
      });
    } catch (error) {
      logger.error(`[Dispatcher] Erro ao atualizar status: ${error}`);
    }
  }

  /**
   * Notificar cliente que nenhum provider foi encontrado
   */
  private async notifyClientNoProviderFound(service: any): Promise<void> {
    try {
      await notificationManager.send(
        Number(service.client_id),
        'no_provider_found',
        service.id,
        '❌ Nenhum Provider Disponível',
        'Desculpe, não encontramos providers disponíveis no momento. Seu pagamento foi reembolsado.'
      );

      logger.info(
        `[Dispatcher] Cliente ${service.client_id} notificado (sem provider)`
      );
    } catch (error) {
      logger.error(`[Dispatcher] Erro ao notificar cliente: ${error}`);
    }
  }

  /**
   * Obter registro de dispatch
   */
  private async getDispatchRecord(
    serviceId: string
  ): Promise<DispatchRecord | null> {
    try {
      const r = await prisma.service_dispatches.findFirst({
        where: { service_id: serviceId }
      });
      
      if (!r) return null;
      
      return {
        service_id: r.service_id,
        current_cycle: r.current_cycle as number,
        current_provider_index: r.current_provider_index as number,
        provider_list: r.provider_list as number[],
        status: r.status,
        last_attempt_at: r.last_attempt_at,
        next_retry_at: r.next_retry_at,
        history: r.history as any[]
      };
    } catch (error) {
      logger.error(`[Dispatcher] Erro ao obter dispatch record: ${error}`);
      return null;
    }
  }
}

export const providerDispatcher = new ProviderDispatcher();
