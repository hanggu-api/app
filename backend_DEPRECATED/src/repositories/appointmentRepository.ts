import prisma from "../database/prisma";
import { Prisma } from "@prisma/client";

export interface ScheduleConfig {
  day_of_week: number;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  slot_duration: number;
  is_active: boolean;
}

export interface Appointment {
  id?: number | bigint;
  provider_id: number | bigint;
  client_id?: number | bigint;
  service_request_id?: string;
  start_time: Date;
  end_time: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'busy' | 'waiting_payment';
  notes?: string;
  // Expanded fields for UI
  client_name?: string;
  client_avatar?: string;
  service_profession?: string;
  service_description?: string;
  service_price?: number;
  service_id?: string;
  service_status?: string;
}

export class AppointmentRepository {
  // ... (keep getScheduleConfig, getDayScheduleConfig, upsertScheduleConfig as is)

  async getScheduleConfig(providerId: number | bigint): Promise<ScheduleConfig[]> {
    const rows = await prisma.provider_schedules.findMany({
      where: { provider_id: BigInt(providerId) },
      orderBy: { day_of_week: 'asc' },
    });

    return rows.map(r => ({
      day_of_week: r.day_of_week,
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      lunch_start: r.break_start ? String(r.break_start) : undefined,
      lunch_end: r.break_end ? String(r.break_end) : undefined,
      slot_duration: (r as any).slot_duration || 30,
      is_active: r.is_enabled,
    }));
  }

  async getDayScheduleConfig(providerId: number | bigint, dayOfWeek: number): Promise<ScheduleConfig | null> {
    const r = await prisma.provider_schedules.findFirst({
      where: { provider_id: BigInt(providerId), day_of_week: dayOfWeek }
    });
    if (!r) return null;
    return {
      day_of_week: r.day_of_week,
      start_time: String(r.start_time),
      end_time: String(r.end_time),
      lunch_start: r.break_start ? String(r.break_start) : undefined,
      lunch_end: r.break_end ? String(r.break_end) : undefined,
      slot_duration: (r as any).slot_duration || 30,
      is_active: r.is_enabled
    };
  }

  async upsertScheduleConfig(providerId: number | bigint, config: any): Promise<void> {
    const isEnabled = config.is_enabled ?? config.is_active ?? true;

    // Find existing schedule
    const existing = await prisma.provider_schedules.findFirst({
      where: {
        provider_id: BigInt(providerId),
        day_of_week: config.day_of_week
      }
    });

    const data = {
      start_time: config.start_time?.substring(0, 5),
      end_time: config.end_time?.substring(0, 5),
      break_start: (config.break_start || config.lunch_start)?.substring(0, 5) || null,
      break_end: (config.break_end || config.lunch_end)?.substring(0, 5) || null,
      is_enabled: isEnabled
    };

    if (existing) {
      await prisma.provider_schedules.update({
        where: { id: existing.id },
        data
      });
    } else {
      await prisma.provider_schedules.create({
        data: {
          provider_id: BigInt(providerId),
          day_of_week: config.day_of_week,
          ...data
        }
      });
    }
  }

  async getAppointments(providerId: number | bigint, start: Date, end: Date): Promise<Appointment[]> {
    const rows = await prisma.appointments.findMany({
      where: {
        provider_id: BigInt(providerId),
        start_time: { lt: end },
        end_time: { gt: start },
        status: { in: ['scheduled', 'busy', 'completed', 'waiting_payment'] }
      },
      include: {
        users_appointments_client_idTousers: {
          select: { full_name: true, avatar_url: true, firebase_uid: true }
        },
        service_requests: {
          select: {
            profession: true,
            description: true,
            price_estimated: true,
            provider_amount: true,
            status: true,
            id: true
          }
        }
      }
    });

    return rows.map(r => ({
      id: r.id,
      provider_id: r.provider_id,
      client_id: r.client_id ?? undefined,
      service_request_id: r.service_request_id ?? undefined,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status as any,
      notes: r.notes || undefined,
      // Map expanded fields
      client_name: r.users_appointments_client_idTousers?.full_name,
      client_avatar: r.users_appointments_client_idTousers?.avatar_url || undefined,
      service_profession: r.service_requests?.profession || undefined,
      service_description: r.service_requests?.description || undefined,
      service_price: Number(r.service_requests?.provider_amount || r.service_requests?.price_estimated || 0),
      service_id: r.service_requests?.id,
      service_status: r.service_requests?.status
    }));
  }

  async getById(id: number | bigint): Promise<Appointment | null> {
    const r = await prisma.appointments.findUnique({ where: { id: BigInt(id) } });
    if (!r) return null;
    return {
      id: r.id,
      provider_id: r.provider_id,
      client_id: r.client_id ?? undefined,
      service_request_id: r.service_request_id ?? undefined,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status as any,
      notes: r.notes || undefined
    };
  }

  async create(appt: Appointment): Promise<number | bigint> {
    const result = await prisma.appointments.create({
      data: {
        provider_id: BigInt(appt.provider_id),
        client_id: appt.client_id ? BigInt(appt.client_id) : null,
        service_request_id: appt.service_request_id || null,
        start_time: appt.start_time,
        end_time: appt.end_time,
        status: appt.status,
        notes: appt.notes || null,
      },
    });
    return result.id;
  }

  async updateStatus(id: number | bigint, status: string): Promise<boolean> {
    const result = await prisma.appointments.update({
      where: { id: BigInt(id) },
      data: { status: status as any, updated_at: new Date() },
    });
    return !!result;
  }

  async checkAvailability(providerId: number | bigint, start: Date, end: Date): Promise<boolean> {
    const count = await prisma.appointments.count({
      where: {
        provider_id: BigInt(providerId),
        status: { in: ['scheduled', 'busy', 'completed'] },
        OR: [
          { AND: [{ start_time: { lt: end } }, { end_time: { gt: start } }] },
          { AND: [{ start_time: { gte: start } }, { start_time: { lt: end } }] }
        ]
      }
    });
    return count === 0;
  }

  async updateAppointmentStatusByServiceId(serviceRequestId: string, status: string): Promise<boolean> {
    const result = await prisma.appointments.updateMany({
      where: { service_request_id: serviceRequestId },
      data: { status: status as any, updated_at: new Date() },
    });
    return result.count > 0;
  }

  async deleteAppointment(id: number | bigint, providerId: number | bigint): Promise<boolean> {
    const result = await prisma.appointments.deleteMany({
      where: { id: BigInt(id), provider_id: BigInt(providerId) },
    });
    return result.count > 0;
  }
}

export const appointmentRepository = new AppointmentRepository();
