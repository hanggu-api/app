import { Request, Response } from "express";
import prisma from "../database/prisma";
import { ServiceRepository } from "../repositories/serviceRepository";
import { appointmentRepository } from "../repositories/appointmentRepository";

export class TestController {
    static async testAppointmentFlow(req: Request, res: Response) {
        const testResults: any[] = [];
        let serviceId: string | null = null;
        let appointmentId: bigint | null = null;

        try {
            const client = await prisma.users.findFirst({ where: { role: 'client' } });
            const provider = await prisma.users.findFirst({ where: { role: 'provider' } });

            if (!client || !provider) {
                throw new Error('Necessário ter pelo menos 1 cliente e 1 provider no banco');
            }

            testResults.push({ step: 1, name: 'Buscar usuários de teste', status: 'passed', data: { client, provider } });

            // Find or create a category to satisfy foreign key
            let category = await prisma.service_categories.findFirst();
            if (!category) {
                category = await prisma.service_categories.create({
                    data: { name: 'Geral', icon_slug: 'box' }
                });
            }

            const scheduledAt = new Date();
            scheduledAt.setHours(scheduledAt.getHours() + 2);

            const serviceRepo = new ServiceRepository();
            serviceId = await serviceRepo.create({
                client_id: client.id,
                category_id: category.id,
                profession: 'Barbeiro',
                description: 'Teste automatizado - Corte + Barba',
                latitude: -23.550520,
                longitude: -46.633308,
                address: 'Endereço de Teste, 123',
                price_estimated: 80.00,
                price_upfront: 24.00,
                status: 'waiting_payment',
                scheduled_at: scheduledAt,
                location_type: 'provider',
                provider_id: provider.id
            });

            testResults.push({ step: 2, name: 'Criar serviço', status: 'passed', data: { serviceId, categoryId: category.id } });

            const appt = await prisma.appointments.findFirst({ where: { service_request_id: serviceId } });
            if (!appt) throw new Error('Appointment não criado');

            appointmentId = appt.id;
            testResults.push({ step: 3, name: 'Verificar appointment', status: 'passed', data: appt });

            await appointmentRepository.updateAppointmentStatusByServiceId(serviceId, 'scheduled');
            testResults.push({ step: 4, name: 'Simular pagamento', status: 'passed' });

            const updatedAppt = await prisma.appointments.findUnique({ where: { id: appointmentId } });
            if (updatedAppt?.status !== 'scheduled') throw new Error('Status não atualizado');

            testResults.push({ step: 5, name: 'Verificar atualização', status: 'passed', data: updatedAppt });

            await prisma.appointments.delete({ where: { id: appointmentId } });
            await prisma.service_requests.delete({ where: { id: serviceId } });
            testResults.push({ step: 6, name: 'Limpar dados', status: 'passed' });

            return res.status(200).json({ success: true, tests: testResults });

        } catch (error: any) {
            console.error("❌ TEST APPOINTMENT FLOW ERROR:", error);
            if (appointmentId) await prisma.appointments.deleteMany({ where: { id: appointmentId } }).catch(() => { });
            if (serviceId) await prisma.service_requests.deleteMany({ where: { id: serviceId } }).catch(() => { });
            return res.status(500).json({ success: false, error: error.message, tests: testResults });
        }
    }

    static async approvePayment(req: Request, res: Response) {
        const { serviceId } = req.params;

        try {
            const service = await prisma.service_requests.findUnique({
                where: { id: serviceId }
            });

            if (!service) {
                return res.status(404).json({ success: false, message: "Service not found" });
            }

            const isRemaining = (service.status === 'waiting_payment_remaining');

            if (isRemaining) {
                await prisma.service_requests.update({
                    where: { id: serviceId },
                    data: { payment_remaining_status: 'paid', status: 'in_progress' }
                });

                if (service.provider_id) {
                    const { notificationManager } = require("../notifications/manager");
                    const { io } = require("../platform");

                    await notificationManager.send(Number(service.provider_id), 'payment_received', serviceId, 'Pagamento Recebido (TESTE)', 'O cliente simulou o pagamento restante.', { service_id: serviceId });

                    io.to(`user:${service.provider_id}`).emit('payment_confirmed', {
                        service_id: serviceId,
                        status: 'in_progress',
                        message: 'Pagamento restante confirmado (TESTE)'
                    });
                }
            } else if (service.status === 'waiting_payment') {
                const { providerDispatcher } = require("../services/providerDispatcher");

                if (service.provider_id) {
                    await prisma.service_requests.update({
                        where: { id: serviceId },
                        data: { status: 'accepted' }
                    });
                } else {
                    await prisma.service_requests.update({
                        where: { id: serviceId },
                        data: { status: 'pending' }
                    });
                    providerDispatcher.startDispatch(serviceId);
                }
            }

            const { DataSyncService } = require("../services/dataSyncService");
            await DataSyncService.syncServiceToFirestore(serviceId);

            const { io } = require("../platform");
            io.to(`service:${serviceId}`).emit('service.updated', {
                id: serviceId,
                status: isRemaining ? 'in_progress' : (service.provider_id ? 'accepted' : 'pending'),
                payment_remaining_status: isRemaining ? 'paid' : undefined
            });

            return res.json({ success: true, message: "Pagamento aprovado via simulador de teste" });
        } catch (error: any) {
            console.error("❌ APPROVE PAYMENT TEST ERROR:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
