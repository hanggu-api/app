import { MercadoPagoConfig, Refund } from 'mercadopago';
import prisma from '../database/prisma';
import logger from '../utils/logger';

/**
 * RefundService: Gerenciar reembolsos automáticos
 * - Auto-refund se nenhum provider encontrado
 * - Check de status de reembolso
 * - Log de falhas para revisão manual
 */
class RefundService {
  private mpClient: any;
  private env: any;

  constructor(env: any) {
    this.env = env;
    this.mpClient = new MercadoPagoConfig({
      accessToken: (env.MP_ACCESS_TOKEN || '').trim(),
    });
  }

  /**
   * Reembolsar automaticamente se dispatch falhar
   * (nenhum provider encontrado após todas as tentativas)
   */
  async autoRefundNoProvider(serviceId: string): Promise<boolean> {
    try {
      const service = await prisma.service_requests.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        logger.warn(`[Refund] Serviço ${serviceId} não encontrado`);
        return false;
      }

      // Verificar se pagou adiantado
      if (service.price_upfront_status !== 'paid') {
        logger.info(
          `[Refund] Serviço ${serviceId} não tem pagamento adiantado`
        );
        return false;
      }

      // Verificar se já tem transação
      if (!service.upfront_transaction_id) {
        logger.error(
          `[Refund] Serviço ${serviceId} sem transaction ID para reembolso`
        );

        // Log para revisão manual
        await this.logRefundFailure(
          serviceId,
          service.upfront_transaction_id || 'NO_ID',
          'No transaction ID found'
        );

        return false;
      }

      // Verificar se já foi reembolsado
      if (service.price_upfront_status === 'refunded') {
        logger.info(`[Refund] Serviço ${serviceId} já foi reembolsado`);
        return true;
      }

      logger.info(
        `[Refund] Iniciando reembolso para serviço ${serviceId}, transação ${service.upfront_transaction_id}`
      );

      // Processar reembolso no Mercado Pago
      const refund = new Refund(this.mpClient);

      try {
        const result = await refund.create({
          payment_id: Number(service.upfront_transaction_id),
        });

        // Atualizar status no BD
        await prisma.service_requests.update({
          where: { id: serviceId },
          data: {
            price_upfront_status: 'refunded',
            refund_transaction_id: String(result.id),
            updated_at: new Date(),
          },
        });

        logger.info(
          `[Refund] ✅ Reembolso criado: ${result.id} para serviço ${serviceId}`
        );

        return true;
      } catch (mpError: any) {
        logger.error(
          `[Refund] Erro ao criar reembolso no MP: ${mpError.message}`
        );

        // Log para revisão manual
        await this.logRefundFailure(
          serviceId,
          service.upfront_transaction_id,
          mpError.message
        );

        throw mpError;
      }
    } catch (error) {
      logger.error(`[Refund] Erro geral: ${error}`);
      return false;
    }
  }

  /**
   * Verificar status de um reembolso
   */
  async checkRefundStatus(refund_id: string): Promise<string | null> {
    try {
      const refund = new Refund(this.mpClient);
      const status = await refund.get(refund_id);

      return status.status; // 'approved', 'rejected', 'pending', 'processing'
    } catch (error) {
      logger.error(`[Refund] Erro ao verificar status ${refund_id}: ${error}`);
      return null;
    }
  }

  /**
   * Reembolsar pagamento específico (manual)
   */
  async manualRefund(serviceId: string, paymentId: string): Promise<any> {
    try {
      const refund = new Refund(this.mpClient);

      const result = await refund.create({
        payment_id: Number(paymentId),
      });

      logger.info(
        `[Refund] Reembolso manual criado: ${result.id} para pagamento ${paymentId}`
      );

      return result;
    } catch (error) {
      logger.error(`[Refund] Erro ao reembolsar manualmente: ${error}`);
      throw error;
    }
  }

  /**
   * Processar reembolsos pendentes (cron job)
   * Verifica reembolsos em status 'processing' e atualiza
   */
  async processPendingRefunds(): Promise<void> {
    try {
      logger.info('[Refund] Processando reembolsos pendentes...');

      const pendingServices = await prisma.service_requests.findMany({
        where: {
          price_upfront_status: 'processing', // Status temporário enquanto aguarda
          refund_transaction_id: { not: null },
        },
        select: {
          id: true,
          refund_transaction_id: true,
        },
      });

      logger.info(`[Refund] Encontrados ${pendingServices.length} reembolsos pendentes`);

      for (const service of pendingServices) {
        const status = await this.checkRefundStatus(
          service.refund_transaction_id || ''
        );

        if (status === 'approved') {
          // Reembolso foi aprovado
          await prisma.service_requests.update({
            where: { id: service.id },
            data: {
              price_upfront_status: 'refunded',
              updated_at: new Date(),
            },
          });

          logger.info(`[Refund] ✅ Reembolso aprovado para ${service.id}`);
        } else if (status === 'rejected') {
          // Reembolso foi rejeitado
          await this.logRefundFailure(
            service.id,
            service.refund_transaction_id || '',
            `Refund rejected by MP: ${status}`
          );

          logger.error(`[Refund] ❌ Reembolso rejeitado para ${service.id}`);
        } else if (status === 'pending' || status === 'processing') {
          // Ainda pendente, aguardar
          logger.info(
            `[Refund] ⏳ Reembolso ainda pendente para ${service.id}`
          );
        }
      }
    } catch (error) {
      logger.error(`[Refund] Erro ao processar reembolsos pendentes: ${error}`);
    }
  }

  /**
   * Log de falhas de reembolso para revisão manual
   */
  private async logRefundFailure(
    serviceId: string,
    paymentId: string,
    error: string
  ): Promise<void> {
    try {
      await prisma.refund_failures.create({
        data: {
          service_id: serviceId,
          payment_id: paymentId,
          error,
          created_at: new Date(),
          reviewed: false,
        },
      });

      logger.warn(
        `[Refund] Falha de reembolso logada para revisão: ${serviceId}`
      );
    } catch (dbError) {
      logger.error(`[Refund] Erro ao logar falha: ${dbError}`);
    }
  }

  /**
   * Obter falhas de reembolso não revisadas
   */
  async getUnreviewedFailures(limit: number = 50): Promise<any[]> {
    try {
      const failures = await prisma.refund_failures.findMany({
        where: { reviewed: false },
        take: limit,
        orderBy: { created_at: 'desc' },
      });

      return failures;
    } catch (error) {
      logger.error(`[Refund] Erro ao buscar falhas: ${error}`);
      return [];
    }
  }

  /**
   * Marcar falha como revisada
   */
  async markFailureAsReviewed(failureId: string, notes: string = ''): Promise<void> {
    try {
      await prisma.refund_failures.update({
        where: { id: failureId },
        data: {
          reviewed: true,
          review_notes: notes,
          reviewed_at: new Date(),
        },
      });

      logger.info(`[Refund] Falha ${failureId} marcada como revisada`);
    } catch (error) {
      logger.error(`[Refund] Erro ao marcar como revisada: ${error}`);
    }
  }
}

export const refundService = new RefundService(process.env as any);
