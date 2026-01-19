import { v4 as uuidv4 } from "uuid";
import prisma from "../database/prisma";
import { appointmentRepository } from "./appointmentRepository";
import { getNearbyProviders } from "../services/locationService";
import { DataSyncService } from "../services/dataSyncService";
import {
  COMMISSION_PERCENT,
  DISPATCH_TIMEOUT_MS,
} from "../utils/config";
import logger from "../utils/logger";
import { Prisma } from "@prisma/client";

// Provider receives 85% of the service price (15% platform commission)
const PROVIDER_COMMISSION_RATE = 0.85;

/**
 * Calculate the net amount a provider receives after platform commission
 */
function calculateProviderAmount(priceEstimated: any): number {
  const price = typeof priceEstimated === 'number'
    ? priceEstimated
    : parseFloat(priceEstimated?.toString() || '0');
  return Math.round(price * PROVIDER_COMMISSION_RATE * 100) / 100;
}

export interface ServiceRequest {
  id: string;
  client_id: number | bigint;
  category_id: number;
  profession?: string;
  description: string;
  latitude: number | Prisma.Decimal;
  longitude: number | Prisma.Decimal;
  address?: string;
  media_url?: string;
  price_estimated: number | Prisma.Decimal;
  price_upfront: number | Prisma.Decimal;
  status: string;
  provider_id?: number | bigint | null;
  scheduled_at?: Date | null;
  location_type?: string;
  payment_remaining_status?: string;
  payment_upfront_status?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class ServiceRepository {
  async create(data: Partial<ServiceRequest>): Promise<string> {
    const id = uuidv4();

    const scheduledAtDate = data.scheduled_at ? new Date(data.scheduled_at) : null;

    const createPayload = {
      id,
      client_id: BigInt(data.client_id!),
      category_id: data.category_id!,
      profession: data.profession ?? null,
      description: data.description ?? null,
      latitude: data.latitude ? new Prisma.Decimal(data.latitude as any) : null as any,
      longitude: data.longitude ? new Prisma.Decimal(data.longitude as any) : null as any,
      address: data.address ?? null,
      price_estimated: data.price_estimated ? new Prisma.Decimal(data.price_estimated as any) : null as any,
      price_upfront: data.price_upfront ? new Prisma.Decimal(data.price_upfront as any) : null as any,
      status: (data.status || "waiting_payment") as any,
      provider_id: data.provider_id ? BigInt(data.provider_id) : null,
      scheduled_at: scheduledAtDate,
      location_type: (data.location_type || "client") as any,
    };

    console.log(`[ServiceRepo] About to create service_request with payload:`, JSON.stringify(createPayload, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    try {
      await prisma.service_requests.create({ data: createPayload });
    } catch (err) {
      console.error(`[ServiceRepo] 🔥 FAILED prisma.service_requests.create:`, err);
      throw err;
    }

    if (scheduledAtDate && data.provider_id) {
      const apptPayload: any = {
        service_request_id: id,
        provider_id: Number(data.provider_id),
        client_id: Number(data.client_id),
        start_time: scheduledAtDate,
        end_time: new Date(scheduledAtDate.getTime() + 60 * 60 * 1000),
        status: "waiting_payment",
      };

      console.log(`[ServiceRepo] About to create appointment with payload:`, JSON.stringify(apptPayload));

      try {
        await appointmentRepository.create(apptPayload);
      } catch (err) {
        console.error(`[ServiceRepo] 🔥 FAILED appointmentRepository.create:`, err);
        throw err;
      }
    }

    const serviceId = id;
    await DataSyncService.syncServiceToFirestore(serviceId);

    return id;
  }

  async findById(id: string): Promise<any | null> {
    const r = await prisma.service_requests.findUnique({
      where: { id },
      include: {
        users: { select: { full_name: true, avatar_url: true } },
        providers: {
          select: {
            users: {
              select: { full_name: true, avatar_url: true }
            }
          }
        },
        reviews: true
      }
    });

    if (!r) return null;

    let providerRating = 0;
    let providerRatingCount = 0;

    if (r.provider_id) {
      const stats = await prisma.service_reviews.aggregate({
        where: { provider_id: Number(r.provider_id) },
        _avg: { rating: true },
        _count: { rating: true }
      });
      providerRating = stats._avg.rating || 0;
      providerRatingCount = stats._count.rating || 0;
    }

    // Flatten for easier consumption
    return {
      ...r,
      client_id: r.client_id,
      provider_id: r.provider_id,
      client_name: r.users?.full_name,
      client_avatar: r.users?.avatar_url,
      provider_name: r.providers?.users?.full_name,
      provider_avatar: r.providers?.users?.avatar_url,
      provider_rating: providerRating,
      provider_rating_count: providerRatingCount,
      provider_amount: calculateProviderAmount(r.price_estimated),
    };
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await prisma.service_requests.update({
      where: { id },
      data: { status: status as any },
    });
    await DataSyncService.syncServiceToFirestore(id);
  }

  async acceptService(id: string, providerId: number | bigint): Promise<void> {
    await prisma.service_requests.update({
      where: { id },
      data: {
        provider_id: BigInt(providerId),
        status: "accepted" as any,
      },
    });
    await DataSyncService.syncServiceToFirestore(id);
  }

  async markArrived(id: string): Promise<void> {
    await prisma.service_requests.update({
      where: { id },
      data: {
        arrived_at: new Date(),
      },
    });
    await DataSyncService.syncServiceToFirestore(id);
  }



  async findProvidersByDistance(
    lat: number,
    lng: number,
    categoryId: number,
    professionId?: number,
    excludeServiceId?: string,
  ): Promise<number[]> {
    // DEV MODE: Increased radius to 50,000km to allow Emulator <-> Real Device testing
    const providerIdStrings = await getNearbyProviders(lat, lng, 50000);

    let matchedIds: number[] = [];

    if (providerIdStrings.length > 0) {
      const providerIds = providerIdStrings.map((id) => BigInt(id));
      const matches = await prisma.provider_professions.findMany({
        where: {
          provider_user_id: { in: providerIds },
          profession_id: professionId || undefined,
        },
        select: { provider_user_id: true },
      });
      matchedIds = [...new Set(matches.map((m) => Number(m.provider_user_id)))];
    }

    // FALLBACK: If no providers found by distance, return ANY provider with this profession
    if (matchedIds.length === 0 && professionId) {
      logger.info(`[ServiceRepo] No nearby providers found for profession ${professionId}. Using global fallback.`);
      const allWithProf = await prisma.provider_professions.findMany({
        where: { profession_id: professionId },
        select: { provider_user_id: true },
        take: 5 // Limit to 5 random providers to avoid spamming everyone in prod, but fine for dev
      });
      matchedIds = allWithProf.map(m => Number(m.provider_user_id));
    }

    // FILTER: Exclude providers who have rejected this specific service
    if (excludeServiceId && matchedIds.length > 0) {
      const rejections = await prisma.service_rejections.findMany({
        where: {
          service_id: excludeServiceId,
          provider_id: { in: matchedIds }
        },
        select: { provider_id: true }
      });

      if (rejections.length > 0) {
        const rejectedSet = new Set(rejections.map(r => Number(r.provider_id)));
        matchedIds = matchedIds.filter(id => !rejectedSet.has(id));
        logger.info(`[ServiceRepo] Filtered out ${rejections.length} providers who rejected service ${excludeServiceId}`);
      }
    }

    return matchedIds;
  }

  async getActiveServicesForProvider(providerId: number | bigint): Promise<any[]> {
    return prisma.service_requests.findMany({
      where: {
        provider_id: BigInt(providerId),
        status: { in: ["accepted", "in_progress"] as any },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getServiceHistory(userId: number | bigint, role: "client" | "provider"): Promise<any[]> {
    const where = role === "client" ? { client_id: BigInt(userId) } : { provider_id: BigInt(userId) };
    const services = await prisma.service_requests.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        users: { select: { full_name: true, avatar_url: true } },
        providers: { select: { users: { select: { full_name: true, avatar_url: true } } } },
        reviews: true
      }
    });

    // Add provider_amount to each service
    return services.map(service => ({
      ...service,
      provider_amount: calculateProviderAmount(service.price_estimated),
    }));
  }

  async findAvailable(): Promise<any[]> {
    const services = await prisma.service_requests.findMany({
      where: {
        status: { in: ["pending"] as any },
        provider_id: null
      },
      orderBy: { created_at: "desc" },
      include: {
        users: { select: { full_name: true, avatar_url: true } },
        service_categories: true
      }
    });

    // Add provider_amount to each service
    return services.map(service => ({
      ...service,
      provider_amount: calculateProviderAmount(service.price_estimated),
    }));
  }

  /**
   * Generate a random 6-digit completion code
   */
  generateCompletionCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Request service completion - generates code and updates status
   */
  async requestCompletion(serviceId: string): Promise<{ code: string }> {
    const code = this.generateCompletionCode();

    await prisma.service_requests.update({
      where: { id: serviceId },
      data: {
        completion_code: code,
        completion_requested_at: new Date(),
        status: 'awaiting_confirmation',
        status_updated_at: new Date(),
      },
    });
    await DataSyncService.syncServiceToFirestore(serviceId);

    return { code };
  }

  /**
   * Confirm service completion with verification code
   */
  async confirmCompletion(serviceId: string, code: string, proofVideo: string | null = null): Promise<boolean> {
    const service = await prisma.service_requests.findUnique({
      where: { id: serviceId },
      select: { completion_code: true, status: true, price_estimated: true, provider_id: true },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    if (service.status !== 'awaiting_confirmation') {
      throw new Error('Service is not awaiting confirmation');
    }

    if (service.completion_code !== code) {
      return false; // Invalid code
    }

    // Code is valid - complete the service and generate credits
    await prisma.$transaction(async (tx) => {
      // 1. Calculate Provider Amount (85% of estimated price)
      const price = Number(service.price_estimated || 0);
      const providerAmount = price * 0.85;

      // 2. Update Service Status and Credit Record
      await tx.service_requests.update({
        where: { id: serviceId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          status_updated_at: new Date(),
          proof_video: proofVideo,
          provider_amount: providerAmount,
        },
      });

      // 3. Update Provider Wallet Balance
      if (service.provider_id) {
        await tx.providers.update({
          where: { user_id: service.provider_id },
          data: {
            wallet_balance: { increment: providerAmount }
          }
        });

        // 4. Create Transaction Record
        await tx.transactions.create({
          data: {
            service_id: serviceId,
            user_id: service.provider_id,
            amount: providerAmount,
            type: 'credit', // Ensure 'credit' is valid enum or string
            status: 'success',
            description: `Crédito pelo serviço ${serviceId}` // Description field check needed
          }
        }).catch(err => console.log('Transaction log error (non-fatal):', err));
      }
    });

    await DataSyncService.syncServiceToFirestore(serviceId);

    return true;
  }

  /**
   * Submit a review for a service
   */
  async submitReview(serviceId: string, reviewerId: bigint, rating: number, comment: string | null = null): Promise<any> {
    const service = await prisma.service_requests.findUnique({
      where: { id: serviceId },
      select: { provider_id: true, status: true, client_id: true }
    });

    if (!service) throw new Error("Service not found");
    if (service.status !== 'completed') throw new Error("Only completed services can be reviewed");
    if (String(service.client_id) !== String(reviewerId)) throw new Error("Only the client can review this service");
    if (!service.provider_id) throw new Error("Service has no provider");

    const review = await prisma.reviews.upsert({
      where: {
        service_id_reviewer_id: {
          service_id: serviceId,
          reviewer_id: reviewerId
        }
      },
      update: {
        rating,
        comment,
        created_at: new Date()
      },
      create: {
        service_id: serviceId,
        reviewer_id: reviewerId,
        reviewee_id: service.provider_id,
        rating,
        comment
      }
    });

    // Calculate new average for provider
    const stats = await prisma.reviews.aggregate({
      where: { reviewee_id: service.provider_id },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.providers.update({
      where: { user_id: service.provider_id },
      data: {
        rating_avg: stats._avg.rating || 0,
        rating_count: stats._count.rating || 0
      }
    });

    await DataSyncService.syncServiceToFirestore(serviceId);

    return review;
  }
}

export const serviceRepository = new ServiceRepository();
