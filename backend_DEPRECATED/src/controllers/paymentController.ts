import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { notificationManager, TEMPLATES } from "../notifications/manager";
import { io } from "../platform";
import { serviceRepository } from "../repositories/serviceRepository";
import { appointmentRepository } from "../repositories/appointmentRepository";
import { providerDispatcher } from "../services/providerDispatcher";
import { DataSyncService } from "../services/dataSyncService";
import { Prisma } from "@prisma/client";
import logger from "../utils/logger";

const client = new MercadoPagoConfig({
  accessToken: (process.env.MP_ACCESS_TOKEN || "").trim(),
});

const payment = new Payment(client);

export class PaymentController {
  static async process(req: Request, res: Response) {
    try {
      const {
        transaction_amount,
        payment_method_id,
        payer,
        service_id,
        payment_type,
        token,
        description,
        installments
      } = req.body;

      if (!service_id) return res.status(400).json({ success: false, message: "service_id required" });

      const service = await serviceRepository.findById(service_id);
      if (!service) return res.status(404).json({ success: false, message: "Service not found" });

      let realAmount = (payment_type === 'remaining')
        ? Number(service.price_estimated) - Number(service.price_upfront)
        : (Number(service.price_upfront) > 0 ? Number(service.price_upfront) : Number(service.price_estimated));

      const paymentBody: any = {
        transaction_amount: realAmount,
        description: description || `Payment for ${service.profession}`,
        payment_method_id,
        notification_url: process.env.NOTIFICATION_URL,
        payer: { email: payer.email },
        metadata: { service_id, user_id: (req as AuthRequest).user?.id, payment_type: payment_type || 'initial' },
        external_reference: `SERVICE-${service_id}`,
        statement_descriptor: "101SERVICE",
        binary_mode: true,
        additional_info: {
          items: [
            {
              id: service_id,
              title: service.profession || "Service 101",
              description: description || `Service: ${service.profession}`,
              category_id: "services",
              quantity: 1,
              unit_price: realAmount
            }
          ]
        }
      };

      if (payment_method_id !== "pix") {
        paymentBody.token = token;
        paymentBody.installments = Number(installments || 1);
      }

      const result = await payment.create({ body: paymentBody });

      await prisma.payments.create({
        data: {
          mission_id: service_id,
          user_id: Number((req as AuthRequest).user!.id),
          amount: new Prisma.Decimal(realAmount),
          status: result.status,
          mp_payment_id: String(result.id),
          payment_method_id,
          payer_email: payer.email
        }
      });

      // If the payment provider returns approved immediately
      if (result.status === 'approved') {
        const currentService = await prisma.service_requests.findUnique({ where: { id: service_id } });
        if (currentService) {
          // Helper for formatting
          const formatCurrency = (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
          const formatDate = (date: any) => {
            if (!date) return '';
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} às ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          };

          const formattedAmount = formatCurrency(realAmount);
          const serviceName = service.profession || 'Serviço';
          const scheduledTime = formatDate(service.scheduled_at);

          const isRemaining = (payment_type === 'remaining' || currentService.status === 'waiting_payment_remaining');
          if (isRemaining) {
            await prisma.service_requests.update({
              where: { id: service_id },
              data: { payment_remaining_status: 'paid', status: 'in_progress' }
            });

            // Notifications for immediate approval
            if (currentService.provider_id) {
              let title = 'Pagamento Recebido';
              let body = `O cliente pagou o valor restante de ${formattedAmount}. Continue o serviço!`;

              // Custom message for Fixed Provider
              if (service.location_type === 'provider') {
                title = '📅 Novo Agendamento Confirmado';
                body = `Serviço ${serviceName} no valor de ${formattedAmount} agendado para ${scheduledTime}.`;
              }

              await notificationManager.send(Number(currentService.provider_id), 'payment_received', service_id, title, body, { service_id });
              io.to(`user:${currentService.provider_id}`).emit('payment_confirmed', {
                service_id,
                status: 'in_progress',
                message: body
              });
            }
            if (currentService.client_id) {
              await notificationManager.send(Number(currentService.client_id), 'payment_confirmed', service_id, '✅ Pagamento Confirmado!', `O pagamento de ${formattedAmount} referente ao serviço "${serviceName}" foi processado com sucesso.`, { service_id });
              io.to(`user:${currentService.client_id}`).emit('payment_confirmed', {
                service_id,
                status: 'in_progress',
                message: 'Pagamento confirmado'
              });
            }

            io.to(`service:${service_id}`).emit('service.updated', {
              id: service_id,
              status: 'in_progress',
              payment_remaining_status: 'paid'
            });

            await DataSyncService.syncServiceToFirestore(service_id);
          } else if (currentService.status === 'waiting_payment') {
            if (currentService.provider_id) {
              await serviceRepository.updateStatus(service_id, 'accepted');

              // NEW: Notify Fixed Provider & Client about initial payment success
              // Client
              await notificationManager.send(Number(currentService.client_id), 'payment_confirmed', service_id, '✅ Pagamento Confirmado!', `O pagamento de ${formattedAmount} referente ao serviço "${serviceName}" foi processado com sucesso.`, { service_id });

              // Provider (Fixed)
              if (service.location_type === 'provider') {
                const title = '📅 Novo Agendamento Confirmado';
                const body = `Serviço ${serviceName} no valor de ${formattedAmount} agendado para ${scheduledTime}.`;
                await notificationManager.send(Number(currentService.provider_id), 'service_assigned', service_id, title, body, { service_id });
              } else {
                // Generic provider notification
                await notificationManager.send(Number(currentService.provider_id), 'service_assigned', service_id, 'Novo Serviço', `Novo serviço confirmado: ${serviceName}`, { service_id });
              }

            } else {
              await serviceRepository.updateStatus(service_id, 'pending');
              providerDispatcher.startDispatch(service_id);
            }
          }
        }
      }

      res.status(201).json({ success: true, payment: result });
    } catch (error) {
      logger.error("Payment error", error);
      res.status(500).json({ success: false });
    }
  }

  static async checkStatus(req: Request, res: Response) {
    const { serviceId } = req.params;
    const p = await prisma.payments.findFirst({ where: { mission_id: serviceId }, orderBy: { created_at: 'desc' } });
    if (!p) return res.status(404).json({ success: false });
    res.json({ success: true, status: p.status });
  }

  static async webhook(req: Request, res: Response) {
    const { type, data } = req.body;

    if (type === 'payment') {
      try {
        const paymentInfo = await payment.get({ id: data.id });
        if (paymentInfo && paymentInfo.status === 'approved') {
          const externalRef = paymentInfo.external_reference; // Format: SERVICE-{id}
          if (externalRef && externalRef.startsWith('SERVICE-')) {
            const serviceId = externalRef.replace('SERVICE-', '');

            // Update payment record in DB
            const localPayment = await prisma.payments.findFirst({ where: { mp_payment_id: String(data.id) } });
            if (localPayment) {
              await prisma.payments.update({ where: { id: localPayment.id }, data: { status: 'approved' } });
            }

            // Check if it is initial or remaining? 
            // Metadata is unreliable in hooks sometimes, but we can check service status.
            const service = await serviceRepository.findById(serviceId);
            if (service) {
              // Helper for formatting
              const formatCurrency = (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
              const formatDate = (date: any) => {
                if (!date) return '';
                const d = new Date(date);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} às ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              };

              const formattedAmount = formatCurrency(paymentInfo.transaction_amount || service.price_estimated);
              const serviceName = service.profession || 'Serviço';
              const scheduledTime = formatDate(service.scheduled_at);

              if (service.status === 'waiting_payment') {
                // 1. Initial payment logic
                if (service.provider_id) {
                  await serviceRepository.updateStatus(serviceId, 'accepted');

                  // NEW: Notify Fixed Provider & Client about initial payment success
                  // Client
                  await notificationManager.send(Number(service.client_id), 'payment_confirmed', serviceId, '✅ Pagamento Confirmado!', `O pagamento de ${formattedAmount} referente ao serviço "${serviceName}" foi processado com sucesso.`, { service_id: serviceId });

                  // Provider (Fixed)
                  if (service.location_type === 'provider') {
                    const title = '📅 Novo Agendamento Confirmado';
                    const body = `Serviço ${serviceName} no valor de ${formattedAmount} agendado para ${scheduledTime}.`;
                    await notificationManager.send(Number(service.provider_id), 'service_assigned', serviceId, title, body, { service_id: serviceId });
                  } else {
                    // Generic provider notification
                    await notificationManager.send(Number(service.provider_id), 'service_assigned', serviceId, 'Novo Serviço', `Novo serviço confirmado: ${serviceName}`, { service_id: serviceId });
                  }

                } else {
                  await serviceRepository.updateStatus(serviceId, 'pending');
                  providerDispatcher.startDispatch(serviceId);
                }
                logger.info(`Webhook: Initial payment handled for ${serviceId}`);
              } else if (service.status === 'waiting_payment_remaining') {
                // 2. Remaining payment logic
                await prisma.service_requests.update({
                  where: { id: serviceId },
                  data: { payment_remaining_status: 'paid', status: 'in_progress' }
                });

                if (service.provider_id) {
                  let title = 'Pagamento Recebido';
                  let body = `O cliente pagou o valor restante de ${formattedAmount}. Continue o serviço!`;

                  // Custom message for Fixed Provider
                  if (service.location_type === 'provider') {
                    title = '📅 Novo Agendamento Confirmado';
                    body = `Serviço ${serviceName} no valor de ${formattedAmount} agendado para ${scheduledTime}.`;
                  }

                  await notificationManager.send(Number(service.provider_id), 'payment_received', serviceId, title, body, { service_id: serviceId });
                }

                // Notify Client
                await notificationManager.send(Number(service.client_id), 'payment_confirmed', serviceId, '✅ Pagamento Confirmado!', `O pagamento de ${formattedAmount} referente ao serviço "${serviceName}" foi processado com sucesso.`, { service_id: serviceId });

                io.to(`service:${serviceId}`).emit('service.updated', {
                  id: serviceId,
                  status: 'in_progress',
                  payment_remaining_status: 'paid'
                });
                await DataSyncService.syncServiceToFirestore(serviceId);
                logger.info(`Webhook: Remaining payment handled for ${serviceId}`);
              }
            }
          }
        }
      } catch (e) {
        logger.error('Webhook processing error', e);
      }
    }
    res.sendStatus(200);
  }
}
