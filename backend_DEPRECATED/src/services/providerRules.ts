import prisma from "../database/prisma";
import logger from "../utils/logger";
import { service_requests_status } from "@prisma/client";

export class ProviderRulesService {
  /**
   * Checks if a provider is currently available to receive new service notifications.
   * A provider is considered unavailable if they have an active service (accepted or in_progress).
   * 
   * @param providerId The ID of the provider to check.
   * @returns Promise<boolean> True if available, False if busy.
   */
  async isProviderAvailable(providerId: number): Promise<boolean> {
    try {
      const busyServices = await prisma.service_requests.findFirst({
        where: {
          provider_id: BigInt(providerId),
          status: { in: ['accepted', 'in_progress'] as service_requests_status[] }
        },
        select: { id: true }
      });

      if (busyServices) {
        logger.info(`ProviderRules: Provider ${providerId} is busy with service ${busyServices.id}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`ProviderRules: Error checking availability for provider ${providerId}`, error);
      return true;
    }
  }

  /**
   * Filters a list of provider IDs, returning only those who are available.
   * 
   * @param providerIds Array of provider IDs.
   * @returns Promise<number[]> Array of available provider IDs.
   */
  async filterAvailableProviders(providerIds: number[]): Promise<number[]> {
    if (providerIds.length === 0) return [];

    const availableProviders: number[] = [];

    for (const pid of providerIds) {
      const isFree = await this.isProviderAvailable(pid);
      if (isFree) {
        availableProviders.push(pid);
      }
    }

    return availableProviders;
  }
}

export const providerRulesService = new ProviderRulesService();
